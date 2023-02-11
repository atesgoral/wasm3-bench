#include <Arduino.h>
#include <m3_env.h>
#include <soc/rtc.h>
#include <wasm3.h>

#ifndef LED_PIN
#define LED_PIN LED_BUILTIN
#endif

#define WASM_STACK_SLOTS 1024
// #define WASM_STACK_SLOTS 16384
#define NATIVE_STACK_SIZE (32 * 1024)

// For (most) devices that cannot allocate a 64KiB wasm page
#define WASM_MEMORY_LIMIT 4096

#define FATAL(func, msg)                                                       \
  {                                                                            \
    Serial.print("Fatal: " func " ");                                          \
    Serial.println(msg);                                                       \
    return;                                                                    \
  }

#define WASM_RELEASE

#ifdef WASM_RELEASE
#include "./release.wasm.h"
#else
#include "./debug.wasm.h"
#endif

#define LOOP_COUNT 10000
#define SAMPLE_COUNT 10
// #define BENCHMARK_WASM

IM3Environment env;
IM3Runtime runtime;
IM3Module module;
IM3Function render;
IM3Function get_render_buffer;

unsigned long calc_mean(unsigned long *samples, int count) {
  unsigned long sum = 0;

  for (int i = 0; i < count; i++) {
    sum += samples[i];
  }

  return sum / count;
}

unsigned long calc_sd(unsigned long *samples, int count) {
  unsigned long m = calc_mean(samples, count);
  unsigned long sum = 0;
  unsigned long delta;

  for (int i = 0; i < count; i++) {
    delta = samples[i] - m;
    sum += delta * delta;
  }

  return sqrt(sum / count);
}

template <typename F> void benchmark(F &&fn) {
  unsigned long samples[SAMPLE_COUNT];

  for (int sample = 0; sample < SAMPLE_COUNT; sample++) {
    unsigned long begin = millis();

    fn(LOOP_COUNT);

    unsigned long lap = millis();

    fn(LOOP_COUNT * 2);

    unsigned long end = millis();

    unsigned long elapsed = (end - lap) - (lap - begin);

    Serial.printf(" %dms", elapsed);

    samples[sample] = elapsed;
  }

  Serial.println();

  unsigned long mean = calc_mean(samples, SAMPLE_COUNT);
  unsigned long sd = calc_sd(samples, SAMPLE_COUNT);

  Serial.printf("-> Mean: %dms SD: %dms\n", mean, sd);
}

void setup() {
  Serial.begin(115200);
  delay(100);

  // Wait for serial port to connect
  // Needed for native USB port only
  while (!Serial) {}

  delay(3000);

  rtc_cpu_freq_config_t cpu_freq_config;
  rtc_clk_cpu_freq_get_config(&cpu_freq_config);

  // rtc_cpu_freq_t cpu_freq = rtc_clk_cpu_freq_get();
  Serial.printf("CPU frequency: %d MHz\n", cpu_freq_config.freq_mhz);
  Serial.printf(
    "CPU source frequency: %d MHz\n", cpu_freq_config.source_freq_mhz
  );

  pinMode(LED_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);

  Serial.println("\nWasm3 v" M3_VERSION " (" M3_ARCH "), build " __DATE__
                 " " __TIME__);

  M3Result result = m3Err_none;

  env = m3_NewEnvironment();
  if (!env)
    FATAL("NewEnvironment", "failed");

  runtime = m3_NewRuntime(env, WASM_STACK_SLOTS, NULL);
  if (!runtime)
    FATAL("NewRuntime", "failed");

#ifdef WASM_MEMORY_LIMIT
  runtime->memoryLimit = WASM_MEMORY_LIMIT;
#endif

  result = m3_ParseModule(env, &module, wasm, sizeof(wasm));
  if (result)
    FATAL("ParseModule", result);

  result = m3_LoadModule(runtime, module);
  if (result)
    FATAL("LoadModule", result);

  Serial.printf(
    "Running %d iterations %d times...\n\n", LOOP_COUNT, SAMPLE_COUNT
  );

#ifdef BENCHMARK_WASM
  ForEachModule(
    runtime,
    [](IM3Module i_module, void *i_info) {
      // Serial.print("Module: ");
      // Serial.println(i_module->name);

      for (int i = 0; i < i_module->numFunctions; ++i) {
        IM3Function function = &i_module->functions[i];

        bool isImported =
          function->import.moduleUtf8 || function->import.fieldUtf8;

        if (isImported) {
          // for (int j = 0; j < function->numNames; j++) {
          //   Serial.print("  Imported function: ");
          //   Serial.println(function->names[j]);
          // }
          continue;
        }

        M3Result result;

        for (int j = 0; j < function->numNames; j++) {
          Serial.printf("Wasm %s:", function->names[j]);

          if (!function->compiled) {
            // Serial.println("    Compiling...");

            result = CompileFunction(function);

            if (result) {
              Serial.print("    Error: ");
              Serial.println(result);
              continue;
            }
          }

          // Check if start function needs to be called
          if (function->module->startFunction) {
            // Serial.println("    Running start function...");

            result = m3_RunStart(function->module);

            if (result) {
              Serial.print("    Error: ");
              Serial.println(result);
              continue;
            }
          }

          auto fn = [function](int loop_count) {
            M3Result result = m3_CallV(function, loop_count);

            if (result) {
              Serial.print("    Error: ");
              Serial.println(result);
            }
          };

          benchmark(fn);
        }
      }

      return (void *)NULL;
    },
    NULL
  );
#endif

  // Serial.printf("sin(2) = %f\n", std::sin(2));
  // Serial.printf("sin(2.0) = %f\n", std::sin((double)2));
  // Serial.printf("sin(2.0) = %f\n", std::sin((float)2.0));
  // Serial.printf("sin(2.0) = %f\n", std::sin((long double)2.0));

  Serial.printf("%s:", "Native std::sin(double)");

  benchmark([](int loop_count) {
    double sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += std::sin((double)i);
    }
  });

  Serial.printf("%s:", "Native std::sin(float)");

  benchmark([](int loop_count) {
    float sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += std::sin((float)i);
    }
  });

  Serial.printf("%s:", "Native sinf(float)");

  benchmark([](int loop_count) {
    float sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += sinf((float)i);
    }
  });

  Serial.printf("%s:", "Native std::sqrt(double)");

  benchmark([](int loop_count) {
    double sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += std::sqrt((double)i);
    }
  });

  Serial.printf("%s:", "Native std::sqrt(float)");

  benchmark([](int loop_count) {
    double sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += std::sqrt((float)i);
    }
  });
}

int frame = 0;

void loop() { delay(1000); }

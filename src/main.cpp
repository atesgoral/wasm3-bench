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

#define SAMPLE_COUNT 10
#define BENCHMARK_NATIVE_MATH

IM3Environment env;
IM3Runtime runtime;
IM3Module module;
IM3Function render;
IM3Function get_render_buffer;

double calc_mean(double *samples, int count) {
  double sum = 0;

  for (int i = 0; i < count; i++) {
    sum += samples[i];
  }

  return sum / count;
}

double calc_sd(double *samples, int count) {
  double mean = calc_mean(samples, count);
  double sum = 0;
  double delta;

  for (int i = 0; i < count; i++) {
    delta = samples[i] - mean;
    sum += delta * delta;
  }

  return sqrt(sum / count);
}

bool led_on = true;

void toggleLed() {
  led_on = !led_on;
  digitalWrite(LED_PIN, led_on ? HIGH : LOW);
}

double sponge = 0;

template <typename F> unsigned long time(F &&fn, int loop_count) {
  unsigned long begin = millis();

  // Absorb return value to prevent compiler from optimizing away the function
  sponge += fn(loop_count);

  unsigned long end = millis();

  return end - begin;
}

String fmt_duration(double duration) {
  if (duration >= 10 * 1000) {
    return String((int)(duration / 1000)) + "s";
  } else if (duration >= 10) {
    return String((int)duration) + "ms";
  } else if (duration >= 10 / 1000.0) {
    return String((int)(duration * 1000)) + "µs";
  } else {
    int ns = (int)(duration * 1000 * 1000);

    if (ns > 0) {
      return String(ns) + "ns";
    } else {
      return "0";
    }
  }
}
template <typename F> void benchmark(F &&fn) {
  double samples[SAMPLE_COUNT];

  int loop_count = 1;

  while (time(fn, loop_count) < 100) {
    loop_count *= 2;
  }

  for (int sample = 0; sample < SAMPLE_COUNT; sample++) {
    toggleLed();

    unsigned long loop_duration = time(fn, loop_count);
    unsigned long loop_2x_duration = time(fn, loop_count * 2);

    double loop_elapsed = loop_2x_duration - loop_duration;

    if (loop_elapsed < 0) {
      loop_elapsed = 0;
    }

    double fn_elapsed = loop_elapsed / loop_count;

    Serial.printf(" %s", fmt_duration(fn_elapsed).c_str());

    samples[sample] = fn_elapsed;
  }

  Serial.println();

  double mean = calc_mean(samples, SAMPLE_COUNT);
  double sd = calc_sd(samples, SAMPLE_COUNT);

  Serial.printf(
    "-> Mean: %s SD: %s\n", fmt_duration(mean).c_str(), fmt_duration(sd).c_str()
  );
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  Serial.begin(115200);
  delay(100);

  // Wait for serial port to connect
  // Needed for native USB port only
  while (!Serial) {}

  delay(3000);

  rtc_cpu_freq_config_t cpu_freq_config;
  rtc_clk_cpu_freq_get_config(&cpu_freq_config);

  Serial.printf("CPU frequency: %d MHz\n", cpu_freq_config.freq_mhz);
  Serial.printf(
    "CPU source frequency: %d MHz\n", cpu_freq_config.source_freq_mhz
  );

  Serial.println("Wasm3 v" M3_VERSION " (" M3_ARCH "), build " __DATE__
                 " " __TIME__);

  Serial.println();

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

            double sum;
            m3_GetResultsV(function, &sum);

            return sum;
          };

          benchmark(fn);
        }
      }

      return (void *)NULL;
    },
    NULL
  );

#ifdef BENCHMARK_NATIVE_MATH
  Serial.printf("%s:", "Native std::sin(double)");

  benchmark([](int loop_count) {
    double sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += std::sin((double)i);
    }

    return sum;
  });

  Serial.printf("%s:", "Native std::sin(float)");

  benchmark([](int loop_count) {
    float sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += std::sin((float)i);
    }

    return sum;
  });

  Serial.printf("%s:", "Native sinf(float)");

  benchmark([](int loop_count) {
    float sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += sinf((float)i);
    }

    return sum;
  });

  Serial.printf("%s:", "Native std::sqrt(double)");

  benchmark([](int loop_count) {
    double sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += std::sqrt((double)i);
    }

    return sum;
  });

  Serial.printf("%s:", "Native std::sqrt(float)");

  benchmark([](int loop_count) {
    double sum = 0;

    for (int i = 0; i < loop_count; i++) {
      sum += std::sqrt((float)i);
    }

    return sum;
  });
#endif

  digitalWrite(LED_PIN, LOW);

  Serial.println("Done!");
}

void loop() { delay(1000); }

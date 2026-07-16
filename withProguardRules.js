const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withProguardRules = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardRulesPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );

      const customRules = `
# WatermelonDB
-keep class com.nozbe.watermelondb.** { *; }

# React Native Worklets Core
-keep class com.margelo.worklets.** { *; }
-keep class com.worklets.** { *; }

# JNI keep rules for C++ interop
-keep class com.facebook.jni.** { *; }
      `;

      if (fs.existsSync(proguardRulesPath)) {
        let contents = fs.readFileSync(proguardRulesPath, 'utf-8');
        if (!contents.includes('com.nozbe.watermelondb')) {
          contents += '\n' + customRules;
          fs.writeFileSync(proguardRulesPath, contents);
        }
      } else {
        fs.writeFileSync(proguardRulesPath, customRules);
      }

      return config;
    },
  ]);
};

module.exports = withProguardRules;

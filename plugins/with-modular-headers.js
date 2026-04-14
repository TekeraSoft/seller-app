const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RNFB_TARGETS = ['RNFBApp', 'RNFBMessaging'];

module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        const snippet = `
  installer.pods_project.targets.each do |target|
    if ${JSON.stringify(RNFB_TARGETS)}.include?(target.name)
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        build_config.build_settings['DEFINES_MODULE'] = 'NO'
      end
    end
  end
`;
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${snippet}`,
        );
        fs.writeFileSync(podfilePath, podfile, 'utf-8');
      }

      return cfg;
    },
  ]);
};

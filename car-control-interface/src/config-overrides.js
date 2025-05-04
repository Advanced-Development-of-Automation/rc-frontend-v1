// config-overrides.js
module.exports = function override(config, env) {
    config.module.rules.forEach((rule) => {
        if (rule.use) {
            rule.use.forEach((use) => {
                if (use.loader && use.loader.includes('source-map-loader')) {
                    use.options = {
                        ...use.options,
                        exclude: [
                            /@react-keycloak\/core/,
                            /@react-keycloak\/web/,
                        ],
                    };
                }
            });
        }
    });
    return config;
};

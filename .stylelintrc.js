module.exports = {
    extends: [
        'stylelint-config-recommended-scss',
    ],
    plugins: [
        'stylelint-order',
        'stylelint-scss'
    ],
    overrides: [
        {
            files: ["src/assets/app.scss"],
            rules: {
                indentation: 4,
            },
        },
        {
            files: ["**/*.vue"],
            customSyntax: "postcss-html",
            rules: {
                indentation: 4,
            },
        },
    ],
    rules: {
        indentation: 2,
        "no-descending-specificity": null,
        "selector-pseudo-class-no-unknown": [true, {
            "ignorePseudoClasses": ["deep",""]
        }]
    },
};

'use strict';

module.exports = function (grunt) {
    require('grunt-commons')(grunt, {
        name: 'ko-grid-aggregate',
        main: 'aggregate',
        internalMain: 'aggregate',

        shims: {
            knockout: 'window.ko',
            'ko-grid': 'window.ko.bindingHandlers[\'grid\']'
        }
    }).initialize({
        less: true
    });
};

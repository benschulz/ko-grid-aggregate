'use strict';

define(['module', 'knockout', 'ko-grid'], function (module, ko, koGrid) {
    var extensionId = module.id.substr(0, module.id.indexOf('/')).substr(0, module.id.indexOf('/'));

    function renderNumber(value) {
        if (Math.abs(value) >= 1)
            return value.toLocaleString();
        else {
            var firstNonZeroFractionDigit = -Math.floor(Math.log(value) / Math.log(10));
            return value.toLocaleString(undefined, {
                maximumFractionDigits: firstNonZeroFractionDigit + 1
            });
        }
    }

    koGrid.defineExtension(extensionId, {
        initializer: function (template) {
            template.to('tfoot').prepend('aggregates', [
                '<tr class="ko-grid-tr ko-grid-aggregate-row" data-bind="indexedRepeat: {',
                '  forEach: extensions.aggregate.__aggregateRows,',
                '  indexedBy: \'id\',',
                '  as: \'aggregateRow\'',
                '}">',
                '  <td class="ko-grid-tf ko-grid-aggregate"',
                '    data-bind="indexedRepeat: {',
                '      forEach: columns.displayed,',
                '      indexedBy: \'id\',',
                '      as: \'column\'',
                '    }"',
                '    data-repeat-bind="',
                '      __gridAggregate: aggregateRow()[column().id],',
                '      _gridWidth: column().width()',
                '"></td>',
                '</tr>'
            ].join(''));
        },
        Constructor: function AggregateExtension(bindingValue, config, grid) {
            var aggregateRows = ko.observable([]);
            this['__aggregateRows'] = aggregateRows;

            if (!Array.isArray(bindingValue))
                return;

            var propertiesOfInterest = [];
            bindingValue.forEach(function (aggregates) {
                Object.keys(aggregates).forEach(function (columnId) {
                    var property = grid.columns.byId(columnId).property;
                    if (propertiesOfInterest.indexOf(property) < 0)
                        propertiesOfInterest.push(property);
                });
            });

            // TODO support date and perhaps other types
            var idCounter = 0;
            var updateAggregates = function () {
                grid.data.source.streamValues(q => q.filteredBy(grid.data.predicate))
                    .then(values => {
                        var statistics = {count: 0};
                        propertiesOfInterest.forEach(function (p) {
                            statistics[p] = {'minimum': Number.POSITIVE_INFINITY, 'maximum': Number.NEGATIVE_INFINITY, 'sum': 0};
                        });

                        return values.reduce(function (_, value) {
                            ++statistics.count;

                            propertiesOfInterest.forEach(function (p) {
                                var propertyStatistics = statistics[p];
                                var v = grid.data.valueSelector(value[p]);
                                propertyStatistics['minimum'] = Math.min(propertyStatistics['minimum'], v);
                                propertyStatistics['maximum'] = Math.max(propertyStatistics['maximum'], v);
                                propertyStatistics['sum'] += v;
                            });

                            return _;
                        }, statistics);
                    }).then(statistics => {
                        var count = statistics.count;

                        aggregateRows(bindingValue.map(function (aggregates) {
                            var row = {id: '' + (++idCounter)};

                            grid.columns.displayed().forEach(function (column) {
                                var columnId = column.id;
                                var property = column.property;
                                var aggregate = aggregates[columnId];

                                if (aggregate) {
                                    row[columnId] = {
                                        column: column,
                                        aggregate: aggregate,
                                        value: count ? renderNumber(aggregate === 'average' ? statistics[property]['sum'] / count : statistics[property][aggregate]) : 'N/A'
                                    };
                                } else {
                                    row[columnId] = {column: column};
                                }
                            });

                            return row;
                        }));

                        grid.layout.recalculate();
                    });
            };

            var predicateSubscription = grid.data.predicate.subscribe(updateAggregates);
            updateAggregates();

            this.dispose = function () { predicateSubscription.dispose(); };
        }
    });

    ko.bindingHandlers['__gridAggregate'] = {
        'init': function (element) {
            while (element.firstChild)
                ko.removeNode(element.firstChild);
            element.appendChild(window.document.createTextNode(''));
            return {
                'controlsDescendantBindings': true
            };
        },
        'update': function (element, valueAccessor) {
            var value = valueAccessor();

            element.className = ['ko-grid-tf ko-grid-aggregate' + (value.aggregate ? ' ' + value.aggregate : '')]
                .concat(value.column.footerClasses()).join(' ');
            element.firstChild.nodeValue = value.aggregate ? value.value : '';
        }
    };

    return koGrid.declareExtensionAlias('aggregate', extensionId);
});

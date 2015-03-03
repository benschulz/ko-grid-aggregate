/**
 * @license Copyright (c) 2015, Ben Schulz
 * License: BSD 3-clause (http://opensource.org/licenses/BSD-3-Clause)
 */
;(function(factory) {
    if (typeof define === 'function' && define['amd'])
        define(['ko-grid', 'ko-indexed-repeat', 'knockout'], factory);
    else
        window['ko-grid-aggregate'] = factory(window.ko.bindingHandlers['grid']);
} (function(ko_grid, ko_indexed_repeat, knockout) {
var ko_grid_aggregate_aggregate, ko_grid_aggregate;

ko_grid_aggregate_aggregate = function (ko, koGrid) {
  function renderNumber(value) {
    if (Math.abs(value) >= 1)
      return value.toLocaleString();
    else {
      var firstNonZeroFractionDigit = -Math.floor(Math.log(value) / Math.log(10));
      return value.toLocaleString(undefined, { maximumFractionDigits: firstNonZeroFractionDigit + 1 });
    }
  }
  koGrid.defineExtension('ko-grid-aggregate', {
    initializer: function (template) {
      template.to('tfoot').prepend('aggregates', [
        '<tr class="ko-grid-tr" data-bind="indexedRepeat: {',
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
      var computer = ko.computed(function () {
        var statistics = {};
        var rows = grid.data.rows.all();
        var count = rows.length;
        propertiesOfInterest.forEach(function (p) {
          statistics[p] = {
            'minimum': Number.POSITIVE_INFINITY,
            'maximum': Number.NEGATIVE_INFINITY,
            'sum': 0
          };
        });
        rows.forEach(function (row) {
          propertiesOfInterest.forEach(function (p) {
            var propertyStatistics = statistics[p];
            var value = grid.data.valueSelector(row[p]);
            propertyStatistics['minimum'] = Math.min(propertyStatistics['minimum'], value);
            propertyStatistics['maximum'] = Math.max(propertyStatistics['maximum'], value);
            propertyStatistics['sum'] += value;
          });
        });
        aggregateRows(bindingValue.map(function (aggregates) {
          var row = { id: '' + ++idCounter };
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
              row[columnId] = { column: column };
            }
          });
          return row;
        }));
      });
      this.dispose = function () {
        computer.dispose();
      };
    }
  });
  ko.bindingHandlers['__gridAggregate'] = {
    'init': function (element) {
      while (element.firstChild)
        ko.removeNode(element.firstChild);
      element.appendChild(window.document.createTextNode(''));
      return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor) {
      var value = valueAccessor();
      element.className = ['ko-grid-tf ko-grid-aggregate' + (value.aggregate ? ' ' + value.aggregate : '')].concat(value.column.footerClasses()).join(' ');
      element.firstChild.nodeValue = value.aggregate ? value.value : '';
    }
  };
  return koGrid.declareExtensionAlias('aggregate', 'ko-grid-aggregate');
}(knockout, ko_grid);
ko_grid_aggregate = function (main) {
  return main;
}(ko_grid_aggregate_aggregate);return ko_grid_aggregate;
}));
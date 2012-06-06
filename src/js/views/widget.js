/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
"use strict";

// Widget view widget

(function($, undefined) {
    $.widget('rib.widgetView', {
        _create: function() {
            var self = this;
            $.getJSON("src/assets/groups.json", function(widgets) {
                self.element.jstree({
                    "json_data": {
                        "data": widgets
                    },
                    "ui": {
                        "initially_select": ["FunctionalGroups"]
                    },
                    "plugins": ["themes", "json_data", "ui"]
                }).bind("select_node.jstree", function(e, data) {
                    $('.paletteView').paletteView('option', "model", jQuery.data(data.rslt.obj[0]));
                });
            });
            return this;
        },
        resize: function(event, widget) {
            var headerHeight = 30, resizeBarHeight = 20, used, e;
            e = this.element;

            // allocate 30% of the remaining space for the filter tree
            used = 2 * headerHeight + resizeBarHeight;
            e.height(Math.round((e.parent().height() - used) * 0.3));
        }
    });
})(jQuery);

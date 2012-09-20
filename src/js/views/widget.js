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

    $.widget('rib.widgetView',  $.rib.treeView, {

        _create: function() {
            var processJSON, widget = this, design = ADM.getDesignRoot();

            // Bind modelUpdated event handler direclty, designReset is using
            // for rebind it after _setOptions();
            this.options.modelUpdated = this._modelUpdatedHandler;
            design.bind('modelUpdated', this._modelUpdatedHandler, this);
            ADM.bind('designReset', this._designResetHandler, this);

            // JSON processor
            processJSON = function (groups) {
                var resolveRefs = function (root, data) {
                    $.each(data, function(name, value) {
                        var refObj;
                        if (value &&  typeof value == "string" &&
                            value.indexOf('#') == 0) {
                            refObj = root;
                            $.each(value.substring(1).split('.'),
                                function (i, attr) {
                                    refObj = refObj[attr];
                                });
                            data.splice(data.indexOf(value), 1, refObj);
                        }
                        else if (value && typeof value === "object")
                            resolveRefs(root, value);
                    });
                };
                resolveRefs(groups, groups);
                widget._groups = groups;
                widget._setOption("model", groups);
                widget._getDefaultSelectedNode().find('> a').trigger('click');
            }

            // Get the json file and initial the tree.
            $.rib.fsUtils.read(
                "groups.json",
                // After read the file succeed, process the JSON file direclty.
                function(jsonText) {
                    processJSON(JSON.parse(jsonText));
                },
                // Read the default groups.json file after failure.
                function() {
                    $.getJSON("src/assets/groups.json", processJSON);
                }
            );
            this._groups = [{}];
            this._selectedNode = undefined;
            this.enableKeyNavigation();
            return this;
        },

        _getDefaultSelectedNode: function() {
            return this.element.find('li').first();
        },

        _nodeSelected: function (treeModelNode, data, domNode) {
            this._selectedNode = treeModelNode;
            this._setSelected(domNode);
            $(':rib-paletteView').paletteView('option', "model", treeModelNode);
        },

        _modelUpdatedHandler: function(event, widget) {
            var type, index,
                recentWidgets = widget._groups[0]['Recent Widgets'];
            // Check the event type and update recent objects array.
            if (typeof(event) === 'object' && event.type == 'nodeAdded') {
                type = event.node.getType();
                index = $.inArray(type, recentWidgets);
                // Remove the widget from recentWidget if the widget is exist
                // in recentWidget and not the first
                if (index > 0)
                    recentWidgets.splice(index, 1);
                // Add the widget to the first of recentWidget array when the
                // widget is not exist in recentWidget or after removed.
                if (index < 0 || index > 0)
                    recentWidgets.unshift(type);
                // Refresh the paletteView when it's displaying recent widgets.
                if (index != 0 && widget._selectedNode == recentWidgets) {
                    $(':rib-paletteView').paletteView('refresh');
                    $.rib.fsUtils.write(
                        "groups.json", JSON.stringify(widget._groups)
                    );
                }
            }
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

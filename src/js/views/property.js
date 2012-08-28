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
// Property view widget

(function($, undefined) {

    $.widget('rib.propertyView', $.rib.baseView, {

        _create: function() {
            var o = this.options,
                e = this.element;

            // Chain up to base class _create()
            $.rib.baseView.prototype._create.call(this);

            this.element
                .append('<div/>')
                .children(':last')
                .addClass('property_content');

            $(window).resize(this, function(event) {
                var el = event.data.element;
                if (el.parent().height() == 0)
                    return;

                var newHeight = Math.round((el.parent().height()
                                - el.parent().find('.pageView').height()
                                - el.parent().find('.property_title')
                                      .height()
                                - 20) // height of ui-state-default + borders
                                * 0.4);
                el.height(newHeight);
            });

            return this;
        },

        _setOption: function(key, value) {
            // Chain up to base class _setOptions()
            // FIXME: In jquery UI 1.9 and above, instead use
            //    this._super('_setOption', key, value)
            $.rib.baseView.prototype._setOption.apply(this, arguments);

            switch (key) {
                case 'model':
                    this.refresh(null, this);
                    break;
                default:
                    break;
            }
        },

        refresh: function(event, widget) {
            widget = widget || this;
            widget._showProperties(ADM.getSelectedNode());
        },

        // Private functions
        _createPrimaryTools: function() {
            return $(null);
        },

        _createSecondaryTools: function() {
            return $(null);
        },

        _selectionChangedHandler: function(event, widget) {
            widget = widget || this;
            //in case current focus input item change event not triggered
            //we trigger it firstly
            $("input:focus").trigger('change');
            widget.refresh(event,widget);
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            if (event && (event.type === "propertyChanged" &&
                        event.node.getType() === 'Design')) {
                return;
            } else {
                widget.refresh(event,widget);
            }
        },

        _showProperties: function(node) {
            var labelId, labelVal, valueId, valueVal, count,
                widget = this, type,  i, child, index, propType,
                p, props, options, code, o, propertyItems, label, value,
                title = this.element.parent().find('.property_title'),
                content = this.element.find('.property_content'),
                continueToDelete, container;

            // Clear the properties pane when nothing is selected
            if (node === null || node === undefined) {
                content.empty()
                    .append('<label>Nothing Selected</label>');
                return;
            }

            type = node.getType();
            title.empty()
                .append('<span>')
                .children(':first')
                    .addClass('title')
                    .text(BWidget.getDisplayLabel(type)+' Properties');
            content.empty();
            propertyItems = $('<div/>').addClass("propertyItems")
                                    .appendTo(content);
            props = node.getProperties();
            options = node.getPropertyOptions();
            // iterate property of node
            for (p in props) {
                if (!BWidget.propertyVisible(node.getType(), p)) {
                    continue;
                }
                labelVal = node.getPropertyDisplayName(p);
                valueId = p+'-value';
                valueVal = props[p];
                propType = BWidget.getPropertyType(type, p);
                code = $('<div/>')
                    .appendTo(propertyItems);
                label = $('<label/>').appendTo(code)
                    .attr('for', valueId)
                    .text(labelVal)
                    .addClass('title');
                value = $('<div/>').appendTo(code);
                // display property of widget
                switch (propType) {
                    case "boolean":
                        // Forbid changing the style of the first page to
                        // "Dialog", we don't want to user adjust style of the
                        // first page
                        if (type === 'Page' &&
                            // FIXME: the knowledge of when to hide or show a
                            // property should come from the widget registry,
                            // not be hard-coded here
                            node.getDesign().getChildren()[0] === node &&
                            p === 'dialog') {
                            code.empty();
                        } else {
                            $('<input type="checkbox"/>')
                                .attr('id', valueId)
                                .appendTo(value);
                        }

                        // FIXME: Boolean values should be actual booleans, not
                        // "true" and "false" strings; but because of bugs we
                        // had previously, data files were written out with the
                        // wrong values, so the following test helps them keep
                        // working correctly. Someday, we should remove it.

                        // initial value of checkbox
                        if ((node.getProperty (p) === true) ||
                            (node.getProperty (p) === "true")) {
                            value.find("#" + valueId).attr("checked", "checked");
                        }
                        break;
                    case "url-uploadable":
                        $('<input type ="text" value="">')
                            .attr('id', valueId)
                            .addClass('title labelInput')
                            .appendTo(value);
                        //set default value
                        value.find('#' + valueId).val(valueVal);
                        $('<button> Upload </button>')
                            .addClass('buttonStyle')
                            .click(function (e) {
                                var target, saveDir;
                                target = $(this).prev("input:text");
                                saveDir = $.rib.pmUtils.ProjectDir + "/" + $.rib.pmUtils.getActive() + "/images/";
                                $.rib.fsUtils.upload("image", $(this).parent(), function(file) {
                                    // Write uploaded file to sandbox
                                    $.rib.fsUtils.write(saveDir + file.name, file, function (newFile) {
                                        target.val("images/" + newFile.name);
                                        target.trigger('change');
                                    });
                                });
                            }).appendTo(value);
                        break;
                    case "record-array":
                        $('<table/>')
                            .attr('id', 'selectOption')
                            .attr('cellspacing', '5')
                            .appendTo(value);
                        var selectOption = value.find('#selectOption');
                        $('<tr/>')
                            .append('<td width="5%"></td>')
                            .append('<td width="45%"> Text </td>')
                                .children().eq(1)
                                .addClass('title')
                                .end().end()
                            .append('<td width="45%"> Value </td>')
                                .children().eq(2)
                                .addClass('title')
                                .end().end()
                            .append('<td width="5%"></td>')
                            .appendTo(selectOption);
                        for (i = 0; i< props[p].children.length; i ++){
                            child = props[p].children[i];
                            $('<tr/>').data('index', i)
                                .addClass("options")
                                .append('<td/>')
                                    .children().eq(0)
                                    .append('<img/>')
                                    .children(':first')
                                    .attr('src', "src/css/images/propertiesDragIconSmall.png")
                                    .end()
                                    .end().end()
                                .append('<td/>')
                                    .children().eq(1)
                                    .append('<input type="text"/>')
                                        .children().eq(0)
                                        .val(child.text)
                                        .addClass('title optionInput')
                                        .change(node, function (event) {
                                            index = $(this).parent().parent().data('index');
                                            props['options'].children[index].text = $(this).val();
                                            node.fireEvent("modelUpdated",
                                                {type: "propertyChanged",
                                                 node: node,
                                                 property: 'options'});
                                        })
                                        .end().end()
                                    .end().end()
                                .append('<td/>')
                                    .children().eq(2)
                                    .append('<input type="text"/>')
                                        .children().eq(0)
                                        .val(child.value)
                                        .addClass('title optionInput')
                                        .change(node, function (event) {
                                            index = $(this).parent().parent().data('index');
                                            props['options'].children[index].value = $(this).val();
                                            node.fireEvent("modelUpdated",
                                                {type: "propertyChanged",
                                                 node: node,
                                                 property: 'options'});
                                        })
                                        .end().end()
                                    .end().end()
                                .append('<td/>')
                                    .children().eq(3)
                                    .append('<img/>')
                                        .children(':first')
                                        .attr('src', "src/css/images/deleteButton_up.png")
                                        // add delete option handler
                                        .click(function(e) {
                                            try {
                                                index = $(this).parent().parent().data('index');
                                                props['options'].children.splice(index, 1);
                                                node.fireEvent("modelUpdated",
                                                    {type: "propertyChanged",
                                                        node: node,
                                                    property: 'options'});
                                            }
                                            catch (err) {
                                                console.error(err.message);
                                            }
                                            e.stopPropagation();
                                            return false;
                                        })
                                        .end()
                                    .end().end()
                               .appendTo(selectOption);
                        }

                        // add add items handler
                        $('<label for=items><u>+ add item</u></label>')
                            .children(':first')
                            .addClass('rightLabel title')
                            .attr('id', 'addOptionItem')
                            .end()
                            .appendTo(value);
                        value.find('#addOptionItem')
                            .click(function(e) {
                                try {
                                    var optionItem = {};
                                    optionItem.text = "Option";
                                    optionItem.value = "Value";
                                    props['options'].children.push(optionItem);
                                    node.fireEvent("modelUpdated",
                                                  {type: "propertyChanged",
                                                   node: node,
                                                   property: 'options'});
                                }
                                catch (err) {
                                    console.error(err.message);
                                }
                                e.stopPropagation();
                                return false;
                            });

                        // make option sortable
                        value.find('#selectOption tbody').sortable({
                            axis: 'y',
                            items: '.options',
                            containment: value.find('#selectOption tbody'),
                            start: function(event, ui) {
                                widget.origRowIndex = ui.item.index() - 1;
                            },
                            stop: function(event, ui) {
                                var optionItem, curIndex = ui.item.index() - 1,
                                    origIndex = widget.origRowIndex;
                                    optionItem = props['options'].children.splice(origIndex,1)[0];

                                props['options'].children.splice(curIndex, 0, optionItem);
                                node.fireEvent("modelUpdated",
                                              {type: "propertyChanged",
                                               node: node,
                                               property: 'options'});
                            }
                        });
                        break;
                    case "targetlist":
                        container = node.getParent();
                        options[p] = ['previous page'];
                        while (container !== null &&
                                container.getType() !== "Page") {
                            container = container.getParent();
                        }
                        var o, pages = ADM.getDesignRoot().getChildren();
                        for (o = 0; o < pages.length; o++) {
                            if (pages[o] === container) {
                                continue;
                            }
                            options[p].push('#' + pages[o].getProperty('id'));
                        }
                        // Don't break to reuse logic of datalist

                    case "datalist":
                        var datalist = createDatalist(options[p]);
                        if (!datalist) break;
                        datalist.addClass('title').appendTo(value);
                        datalist.find('input[type="text"]')
                                .attr('id', valueId)
                                .addClass('title labelInput')
                                .val(valueVal);
                        break;
                    default:
                        // handle property has options
                        if (options[p]) {
                            $('<select size="1">').attr('id', valueId)
                                    .addClass('title')
                                    .appendTo(value);
                            if (type === 'Button' && p === 'opentargetas'
                                && node.getProperty('target') ===
                                    'previous page') {
                                value.find('#'+valueId).attr('disabled', 'disabled');
                            }
                            //add options to select list
                            for (o in options[p]) {
                                //TODO make it simple
                                $('<option value="' + options[p][o] +
                                  '">' +options[p][o] + '</option>')
                                    .appendTo(value.find("#" + valueId));
                                value.find('#'+ valueId).val(valueVal);
                            }
                        } else {
                            $('<input type ="text" value="">')
                                .attr('id', valueId)
                                .addClass('title labelInput')
                                .appendTo(value);
                            //set default value
                            value.find('#' + valueId).val(valueVal);
                        }
                        break;
                }

                content.find('#' + valueId)
                    .change(node, function (event) {
                        var updated, node, element, type, value, ret, selected;
                        updated = event.target.id.replace(/-value/,'');
                        node = event.data;
                        // FIXME: The "change" event will refresh property view
                        // so "click" event of datalist is not triggered.
                        // We have to look up the ":hover" class here to decide
                        // which item is clicked
                        selected = $(this).parent().find('.datalist ul li:hover');
                        if (selected.length > 0) {
                            selected.click();
                            return;
                        }

                        if (node === null || node === undefined) {
                            throw new Error("Missing node, prop change failed!");
                        }
                        value = validValue($(this),
                            BWidget.getPropertyType(node.getType(), updated));
                        ret = ADM.setProperty(node, updated, value);
                        type = node.getType();
                        if (ret.result === false) {
                            $(this).val(node.getProperty(updated));
                        } else if (type === "Button" &&
                            value === "previous page") {
                            ADM.setProperty(node, "opentargetas", "default");
                        }
                        event.stopPropagation();
                        return false;
                    });
            }

            // add delete element button
            $('<div><button> Delete Element </button></div>')
                .addClass('property_footer')
                .children('button')
                .addClass('buttonStyle')
                .attr('id', "deleteElement")
                .end()
                .appendTo(content);
            content.find('#deleteElement')
                .bind('click', function (e) {
                    var msg, node;
                    node = ADM.getSelectedNode();
                    if (!node) {
                        return false;
                    }
                    if (node.getType() === "Page") {
                        // TODO: i18n
                        msg = "Are you sure you want to delete the page '%1'?";
                        msg = msg.replace("%1", node.getProperty("id"));
                        $.rib.confirm(msg, function () {
                            $.rib.pageUtils.deletePage(node.getUid());
                        });
                    } else {
                        ADM.removeChild(node.getUid(), false);
                    }
                    e.stopPropagation();
                    return false;
                });

            function validValue(element, type) {
                var ret = null, value = element.val();
                switch (type) {
                    case 'boolean':
                        ret = element.is(':checked');;
                        break;
                    case 'float':
                        ret = parseFloat(value);
                        break;
                    case 'integer':
                        ret = parseInt(value, 10);
                        break;
                    case 'number':
                        ret = Number(value);
                        break;
                    case 'object':
                        ret = Object(value);
                        break;
                    case 'string':
                        ret = String(value);
                        break;
                    default:
                        ret = value;
                        break;
                }
                return ret;
            };
        }
    });

     /**
     * Update options list according an array.
     * @param {JQObject} optionsList Container options will be appended to
     * @param {String} options Options array, item in the array can be string
     *     or object, which contains:
     *     {
     *         value: must have
     *         clickCallback: optional, the default handler is to
     *             fill the text input with this option's value.
     *         cssClass: special css class need to be added to list item
     *         stable: if the item is stable and fixed in the list, it means
     *                 the item will always show in the list
     *     }
     * @return {JQuery Object} return root object of datalist if success, false null.
     *
     */
    function updateOptions (optionsList, optionArray) {
        var i, value, option, handler,
            defaultHandler, cssClass, stable;

        // its value will fill the input
        defaultHandler = function(e) {
            var optionsWrapper = $(this).parents('.datalist:first');
            optionsWrapper.hide();
            optionsWrapper.prev('input')
                .val($(this).text())
                .change();
        };
        // remove items which is not stable
        optionsList.find(':not(.stable)').remove();
        // fill the optionsList
        for (i in optionArray) {
            option = optionArray[i];
            value = handler = null;
            cssClass = '';
            if (option instanceof Object) {
                value = option.value;
                handler = option.clickCallback;
                cssClass = option.cssClass;
                if (option.stable) {
                    cssClass += ' stable';
                }
            } else if (typeof option === 'string') {
                value = option;
            }
            if (!value) continue;
            if (typeof handler !== 'function') {
                handler = defaultHandler;
            }
            $('<li>' + value + '</li>')
                .click(handler)
                .addClass(cssClass)
                .appendTo(optionsList);
        }
        return;
    }

    /**
     * Create a datalist from an options array.
     * @param {String} options Options array, item in the array can be string
     *     or object, which contains:
     *     {
     *         value: must have
     *         clickCallback: optional, the default handler is to
     *             fill the text input with this option's value.
     *         cssClass: special css class need to be added to list item
     *         stable: if the item is stable and fixed in the list, it means
     *                 the item will always show in the list
     *     }
     * @return {JQuery Object} return root object of datalist if success, false null.
     *
     */
    function createDatalist(options) {
        var datalist, input, optionsList;
        if (!(options instanceof Array)) {
            console.error('Creating datalist error.');
            return null;
        }
        // create base structure
        datalist =  $('<div/>');
        input = $('<input type="text" value=""/>').appendTo(datalist);
        optionsList = $('<ul/>');
        $('<div style="display:none"/>')
            .addClass('datalist')
            .append(optionsList)
            .appendTo(datalist);

        // bind event handler, to show the options
        input.click(function (e){
            $(this).toggleClass('datalist-input');
            $(this).nextAll('.datalist:first').toggle();
        });
        // bind keyup event handler to filter matched options
        input.keyup(options, function (e){
            var options = e.data,
                matchedOptions = [],
                inputedText = this.value,
                optionsList = $(this).nextAll('.datalist').first().find('ul');
            matchedOptions = $.grep(options, function(item, i){
                var value;
                if (item instanceof Object) {
                    value = item.value;
                    if (item.stable) return false;
                } else if (typeof item === 'string') {
                    value = item;
                }
                return value && (value.indexOf(inputedText) >= 0);
            });
            updateOptions(optionsList, matchedOptions);
            $(this).addClass('datalist-input');
            optionsList.parent('.datalist').show();
        });
        // fill the list initially
        updateOptions(optionsList, options);
        return datalist;
    }

})(jQuery);

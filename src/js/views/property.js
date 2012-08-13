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
            var node;
            widget = widget || this;
            if (event) {
                if (event.node && !(event.name === "modelUpdated" &&
                    event.type === "nodeRemoved")) {
                    if (event.type === "propertyChanged" && event.node.getType() === 'Design') {
                        return;
                    }
                    widget._showProperties(event.node);
                } else {
                    node = ADM.getActivePage();
                    widget._showProperties(node);
                }
            }
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

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh(event,widget);
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh(event,widget);
        },

        _showProperties: function(node) {
            var labelId, labelVal, valueId, valueVal, count,
                widget = this, type,  i, child, index, propType,
                p, props, options, code, o, propertyItems, label, value,
                design = ADM.getDesignRoot(),
                title = this.element.parent().find('.property_title'),
                content = this.element.find('.property_content'),
                continueToDelete, buttonsContainer;

            // Clear the properties pane when nothing is selected
            if (node === null || node === undefined) {
                node = ADM.getActivePage();
                if (node === null || node === undefined) {
                    content.empty()
                        .append('<label>Nothing Selected</label>');
                    return;
                }
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
                    case "datalist":
                        $('<div class="title"/>')
                            .append(
                                $('<input type="text" value=""/>')
                                    .attr('id', valueId)
                                    .addClass('labelInput')
                                    .click({'p': p, 'value': value}, function(e){
                                        var o, items = "",
                                            value = e.data.value, p = e.data.p;

                                        for (o in options[p]) {
                                            items += '<li>' + options[p][o] + '</li>';
                                        }
                                        value.find('ul')
                                            .html("")
                                            .append($(items));

                                        $(this).toggleClass('datalist-input');
                                        value.find('.datalist').toggle();
                                    })
                                    .keyup({ 'p' : p, 'value' : value}, function(e){
                                        var matchedOptions = [], o, items = "",
                                            inputedText = this.value,
                                            value = e.data.value;
                                        matchedOptions = $.grep(options[e.data.p], function(item, i){
                                            return item.indexOf(inputedText) >= 0;
                                        });

                                        for (o in matchedOptions) {
                                            items += '<li>' + matchedOptions[o] + '</li>';
                                        }
                                        value.find('ul')
                                            .html("")
                                            .append(items);

                                        $(this).addClass('datalist-input');
                                        value.find('.datalist').show();
                                    })
                            )
                            .append(
                                $('<div style="display:none"/>')
                                .addClass('datalist')
                                .append('<ul/>')
                            )
                        .appendTo(value);
                        value.delegate(".datalist li", "click", function(e) {
                            $(this).parent().parent().parent().find('input')
                                   .val($(this).text()).change().end()
                                   .find('.datalist').hide().end();
                        });
                        value.find('#'+ valueId).val(valueVal);
                        break;
                    case "targetlist":
                        $('<div class="title"/>')
                            .append(
                                $('<input type="text" value=""/>')
                                    .attr('id', valueId)
                                    .addClass('labelInput')
                                    .click({'p': p, 'value': value}, function(e) {
                                        var o, items = "", pages, id,
                                            value = e.data.value, p = e.data.p;

                                        pages = design.getChildren();
                                        for (o = 0; o < pages.length; o++) {
                                            id = pages[o].getProperty('id');
                                            items += '<li>#' + id + '</li>';
                                        }
                                        value.find('ul')
                                            .html("")
                                            .append($(items));

                                        $(this).toggleClass('datalist-input');
                                        value.find('.datalist').toggle();
                                    })
                            )
                            .append(
                                $('<div style="display:none"/>')
                                .addClass('datalist')
                                .append('<ul/>')
                            )
                        .appendTo(value);
                        value.delegate(".datalist li", "click", function(e) {
                            $(this).parent().parent().parent().find('input')
                                   .val($(this).text()).change().end()
                                   .find('.datalist').hide().end();
                        });
                        if (valueVal === "back") {
                        } else {
                            value.find('#' + valueId).val(valueVal);
                        }
                        break;
                    default:
                        // handle property has options
                        if (options[p]) {
                            $('<select size="1">')
                                .attr('id', valueId)
                                .addClass('title')
                                .appendTo(value);
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

                        if (node === null || node === undefined) {
                            throw new Error("Missing node, prop change failed!");
                        }
                        if (selected.length > 0) {
                            $(this).val(selected.text());
                        }
                        value = validValue($(this),
                            BWidget.getPropertyType(node.getType(), updated));
                        ret = ADM.setProperty(node, updated, value);
                        if(ret.result === false) {
                            $(this).val(node.getProperty(updated));
                        }
                        event.stopPropagation();
                        return false;
                    });
            }

            // add buttons container
            buttonsContainer = $('<div>')
                .addClass('property_footer')
                .appendTo(content)
                .end();

            // add delete element button
            $('<button>Delete Element</button>')
                .addClass('buttonStyle')
                .attr('id', "deleteElement")
                .appendTo(buttonsContainer)
                .bind('click', function (e) {
                    var parent, zone, index, msg;
                    var doDelete = function () {
                        try {
                            index = node.getZoneIndex();
                            parent = node.getParent();
                            zone = parent.getZoneArray(node.getZone());
                            if (type === "Page") {
                                $.rib.pageUtils.deletePage(node.getUid(), false);
                            } else {
                                ADM.removeChild(node.getUid(), false);
                            }
                            // Select sibling of removed node, or parent node
                            // if removed node is the last node of parent.  The
                            // order is next sibling, prev sibling and parent
                            if (zone.length === 0) {
                                //find the first selectable ancestor
                                while (!parent.isSelectable()) {
                                    parent = parent.getParent();
                                }
                                ADM.setSelected(parent);
                            } else if (index < zone.length) {
                                ADM.setSelected(zone[index])
                            } else {
                                ADM.setSelected(zone[zone.length - 1]);
                            }
                        }
                        catch (err) {
                            console.error(err.message);
                        }
                    }
                    if (type === "Page") {
                        // TODO: i18n
                        msg = "Are you sure you want to delete the page '%1'?";
                        msg = msg.replace("%1", node.getProperty("id"));
                        $.rib.confirm(msg, doDelete);
                    } else {
                        doDelete();
                    }
                    e.stopPropagation();
                    return false;
                });

            // Add event handler button
            $('<button>Add Event Handlers</button>')
                .addClass('buttonStyle')
                .attr('id', "eventHandlerElement")
                .appendTo(buttonsContainer)
                .bind('click', function(e) {
                    var formContainer, leftPannel, leftPannelContainer,
                        rightPannel, eventElement, eventSelectElement,
                        emptyEditorContentFunc, eventEditorContainer,
                        eventEditor, formElement, jsCode, uniqueIdName = 'id';

                    // If node have no ID property, then return directly.
                    if(typeof(BWidget.propertyExists(node.getType(), uniqueIdName)) == 'undefined') {
                        alert('Event handler must be using with the element have ID property.');
                        return false;
                    };

                    // Construct the page layout
                    formContainer = $('<div class="hbox" />');
                    leftPannel = $('<div class="flex1 vbox wrap_left" />')
                        .appendTo(formContainer)
                    rightPannel =$('<div class="flex1 wrap_right" />')
                        .appendTo(formContainer)

                    /*** Left pannel contents ***/

                    $('<div class="title"><label>Event</label></div>')
                        .appendTo(leftPannel);

                    leftPannelContainer = $('<div>')
                        .addClass('container')
                        .appendTo(leftPannel);

                    // Construct event options elements
                    eventSelectElement = $('<select>')
                        .attr({'name': 'selectedEvent'})
                        .addClass('center')
                        .append($('<option value="">------</option>'))
                        .change(function(e) {
                            formElement.trigger('submit');
                        })
                        .select()
                        .appendTo(leftPannelContainer);

                    // Generate the event properties list.
                    for (p in props) {
                        if (BWidget.getPropertyType(node.getType(), p) != 'event')
                            continue;

                        $('<option>')
                            .attr('value', p)
                            .html(node.getPropertyDisplayName(p))
                            .appendTo(eventSelectElement);
                    }

                    // Add a hidden input to store current event name
                    eventElement = $(
                        '<input name="currentEvent" type="hidden" value="" />'
                    ).appendTo(leftPannelContainer);

                    // Intial the the trash button
                    emptyEditorContentFunc = function (e) {
                        e.preventDefault();
                        var askClean = $.rib.confirm(
                            'Are you sure to clean the javascript codes?',
                            function() {
                                eventEditor.setValue('');
                            }
                        );
                    };

                    $('<a href="javascript:void(0)">Delete</a>')
                        .addClass('emptyLink')
                        .click(emptyEditorContentFunc)
                        .appendTo(leftPannelContainer);

                    $('<button>Empty editor</button>')
                        .addClass('emptyButton')
                        .button({
                            text: false,
                            icons: {
                                primary: "ui-icon-trash"
                            }
                        })
                        .click(emptyEditorContentFunc)
                        .appendTo(leftPannelContainer);

                    // Create the DONE button
                    $('<button>Done</button>')
                        .addClass('buttonStyle doneButton')
                        .click( function (e) {
                            formElement.dialog('close');
                        })
                        .button()
                        .appendTo(leftPannelContainer);

                    /*** Right pannel contents ***/

                    $('<div class="title"><label>Javascript Code</label></div>')
                        .appendTo(rightPannel);

                    // Construct code editor element
                    eventEditorContainer = $('<div/>')
                        .addClass('container')
                        .appendTo(rightPannel);
                    eventEditor = CodeMirror(
                        eventEditorContainer[0],
                        {
                            mode: "javascript",
                            readOnly: 'nocursor',
                        }
                    );
                    eventEditorContainer.show();

                    /*** Dialog contents ***/

                    formElement = $('<form>')
                        .attr('id', 'eventHandlerDialog')
                        .append(formContainer)
                        .dialog({
                            title: "Event Handlers("
                                + BWidget.getDisplayLabel(type)
                                + (node.getProperty('id') ?
                                    "#" + node.getProperty('id'):'') + ")",
                            modal: true,
                            width: 769,
                            height: 460,
                            resizable: false
                         })
                        .bind('dialogclose', function(e) {
                            $(this).trigger('submit');
                        })
                        .bind('saveEventsToFile', function(e) {
                            var results, result, matchedProps, id, eventCode, 
                                eventName,
                                jsCode = '$(document).ready(function(e) {\n';
                            
                            // Regenerate the whole event javascript codes
                            // and save to sandbox.
                            results = design.findNodesByProperty(
                                {'type': 'event'}
                            );
                            for (var i=0; (result = results[i]); i++) {
                                id = result.node.getProperty('id');
                                if (!id)
                                    continue
                                matchedProps = result.properties;
                                for (eventName in matchedProps) {
                                    eventCode = matchedProps[eventName];
                                    // If ID property or eventCode is not defined, then next.
                                    if (!eventCode)
                                        continue;
                                    // Append the event code to the whole js code content.
                                    jsCode += '$("#' + id + '").bind("' + eventName + '", function(e) {'
                                        + '\n' + eventCode + '\n'
                                        + '});\n\n';
                                }
                            }
                            jsCode += '});';
                            // Make the JS code more beautiful.
                            jsCode = js_beautify(jsCode);
                            $.rib.addCustomFile(
                                'js/main.js', 'js', jsCode
                            );
                        })
                        .bind('submit', function(e) {
                            e.preventDefault();

                            // Serialize the form data to JSON.
                            var formData = $(this).serializeJSON();
                            formData['jsCode'] = eventEditor.getValue();
                            
                            // If ID is blank, generate a unique one.
                            if(node.getProperty(uniqueIdName) == '') {
                                node.generateUniqueProperty(
                                    uniqueIdName, true
                                );
                            }

                            // Save editor content to ADM property.
                            if (formData.currentEvent) {
                                node.setProperty(
                                    formData.currentEvent,
                                    formData.jsCode
                                );
                                // Regenerate main.js file.
                                $(this).trigger('saveEventsToFile');
                            }

                            // Load the jsCode
                            //
                            // Checking the event select element changed
                            //
                            // If old event is not equal to current event in
                            // select, it's meaning the select changed not
                            // the window close, so we need to load the JS
                            // code from new selected property and change the
                            // editor content.
                            if (formData.currentEvent != formData.selectedEvent) {
                                if (formData.selectedEvent) {
                                    // Load the event property content and set
                                    // the editor content.
                                    jsCode = node.getProperty(
                                        formData.selectedEvent
                                    );
                                    if (typeof(jsCode) != 'string')
                                        jsCode = '';
                                    eventEditor.setOption('readOnly', false);
                                    eventEditor.setValue(jsCode);
                                } else {
                                    // Check the selection of event, if
                                    // selected blank will clean up the editor
                                    // content and set editor to be read only.
                                    eventEditor.setValue('');
                                    eventEditor.setOption(
                                        'readOnly', 'nocursor'
                                    );
                                }

                                // Set currentEvent element to selctedEvent.
                                eventElement.val(formData.selectedEvent);
                            };
                        });
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
})(jQuery);

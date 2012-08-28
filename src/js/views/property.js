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
            this.element.delegate('*', 'focus', function(e){
                window.focusElement = this;
                e.stopPropagation();
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

        _setProperty: function(property, value) {
            var viewId = property + '-value';
            this.element.find("#" + viewId).val(value);
        },

        _modelUpdatedHandler: function(event, widget) {
            var affectedWidget, id;

            widget = widget || this;
            if (event && event.type === "propertyChanged") {
                if (event.node.getType() === 'Design') {
                    return;
                }
                widget._setProperty(event.property, event.newValue);
            } else {
                widget.refresh(event,widget);
                if (event.type === 'propertyChanged') {
                    id = event.property + '-value';
                    affectedWidget = widget.element.find('#' + id);
                    affectedWidget[0].scrollIntoViewIfNeeded();
                    affectedWidget.effect("highlight", {}, 1000);
                }
            }
        },

        _showProperties: function(node) {
            var labelId, labelVal, valueId, valueVal, count,
                widget = this, type,  i, child, index, propType,
                p, props, options, code, o, propertyItems, label, value,
                design = ADM.getDesignRoot(),
                title = this.element.parent().find('.property_title'),
                content = this.element.find('.property_content'),
                continueToDelete, buttonsContainer, container, range, min, max;

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
                    case "integer":
                        range = BWidget.getPropertyRange(type, p);
                        if (range) {
                            min = range.split('-')[0];
                            max = range.split('-')[1];
                            $('<input type="number"/>')
                                .addClass('title labelInput')
                                .attr({
                                    id: valueId,
                                    min: min,
                                    max: max
                                })
                                .change(function(event) {
                                    if( parseInt(this.value) > parseInt(this.max) ||
                                        parseInt(this.value) < parseInt(this.min)) {
                                            $(this).effect("highlight", {color: "red"}, 1000);
                                            event.stopImmediatePropagation();
                                            this.value = valueVal;
                                    }
                                })
                                .appendTo(value);
                            //set default value
                            value.find('#' + valueId).val(valueVal);
                        }
                        break;
                    case "url-uploadable":
                        $('<input type ="text" value="">')
                            .attr('id', valueId)
                            .addClass('title labelInput')
                            .appendTo(value);
                        //set default value
                        value.find('#' + valueId).val(valueVal.value);
                        $('<button> Upload </button>')
                            .addClass('buttonStyle')
                            .click({node:node, property:p}, function (e) {
                                var saveDir = $.rib.pmUtils.getProjectDir() + "images/";
                                $.rib.fsUtils.upload("image", $(this).parent(), function(file) {
                                    // Write uploaded file to sandbox
                                    $.rib.fsUtils.write(saveDir + file.name, file, function (newFile) {
                                        ADM.setProperty(e.data.node, e.data.property, {
                                            inSandbox: true,
                                            value: "images/" + newFile.name
                                        });
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
                                    .append('<div class="delete button">Delete</div>')
                                        .children(':first')
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
                                        items += '<li>previous page</li>';
                                        container = node.getParent();
                                        while (container !== null &&
                                            container.getType() !== "Page") {
                                            container = container.getParent();
                                        }
                                        pages = design.getChildren();
                                        for (o = 0; o < pages.length; o++) {
                                            if (pages[o] === container) {
                                                continue;
                                            }
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

                        if (node === null || node === undefined) {
                            throw new Error("Missing node, prop change failed!");
                        }
                        if (selected.length > 0) {
                            $(this).val(selected.text());
                        }
                        value = validValue(
                            node, $(this),
                            BWidget.getPropertyType(node.getType(), updated)
                        );
                        ret = ADM.setProperty(node, updated, value);
                        type = node.getType();
                        if (ret.result === false) {
                            $(this).effect("highlight", {color: "red"}, 1000).val(node.getProperty(updated));
                        } else if (type === "Button" &&
                            value === "previous page") {
                            ADM.setProperty(node, "opentargetas", "default");
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

            // Add event handler button
            $('<button>Event Handlers...</button>')
                .addClass('buttonStyle')
                .attr('id', "eventHandlerElement")
                .appendTo(buttonsContainer)
                .bind('click', function(e) {
                    var generateEventSelectElement, generateEventHandlersList,
                        removeEventHandler, eventLinkClicked;
                    var formContainer, leftPannel, leftPannelContainer,
                        rightPannel, eventElement, eventSelectElement,
                        eventEditorContainer, eventEditor, formElement,
                        jsCode, eventHandlersList, id,
                        uniqueIdName = 'id';

                    // If node have no ID property, then return directly.
                    if(typeof(BWidget.propertyExists(node.getType(), uniqueIdName)) == 'undefined') {
                        alert('Event handler must be using with the element have ID property.');
                        return false;
                    };

                    /*
                     * Call back functions.
                     */

                    // Remove event handler
                    removeEventHandler = function(e) {
                        e.preventDefault();
                        var eventName = $(this).parent().attr('rel');
                        $.rib.confirm(
                            'Are you sure you want to delete the '
                                + eventName
                                + ' event handler?',
                            function() {
                                node.setProperty(eventName, '');
                                if (eventElement.val() == eventName)
                                    eventEditor.setValue('');
                                formElement.trigger('submit');
                            }
                        );
                    }

                    // Event link clicked callback
                    eventLinkClicked = function(e) {
                        e.preventDefault();
                        var eventName = $(this).parent().attr('rel');
                        eventSelectElement.val(eventName);
                        formElement.trigger('submit');
                    }

                    /*
                     * Elements generation functions.
                     */

                    // Generate the event property select options.
                    generateEventSelectElement = function(selectElement, matchedProps) {
                        var selected, newSelectElement, result, matchedProps,
                        optionElement, eventName, optionsGroup;

                        // Store the old selected event.
                        selected = selectElement.val();

                        // Clean up the origin options.
                        selectElement.find('option').remove();

                        // Search event properties
                        if (!matchedProps)
                            matchedProps = node.getMatchingProperties(
                                {'type': 'event'}
                            );

                        // Added a initial blank option;
                        $('<option value="">[Select an event handler]</option>')
                            .addClass('cm-inactive')
                            .appendTo(selectElement);

                        // TODO: Classify the events and use optgroup to
                        //        genereate it.
                        /*
                        optionsGroup = $(
                            '<optgroup label="[Select an event handler]"></optgroup>'
                        )
                            .appendTo(selectElement);
                        */

                        // Generate event select options.
                        for (eventName in matchedProps) {
                            optionElement = $('<option>')
                                .attr('value', eventName)
                                .html(node.getPropertyDisplayName(eventName))
                                .appendTo(selectElement);

                            // If the event is selcted, then check it to be
                            // selected again.
                            if (eventName == selected)
                                optionElement.attr('selected', 'selected');

                            // If the event have codes, then highlight it.
                            if (typeof(matchedProps[eventName]) != 'string')
                                continue;
                            if (matchedProps[eventName].trim() == '')
                                continue;
                            optionElement.addClass('cm-active');
                            optionElement.html(optionElement.html() + ' *');
                        }
                    }

                    // Generate the event event handler that had codes list area.
                    generateEventHandlersList = function(selectElement, matchedProps) {
                        var selected, ulElement, liElement, aElement,
                            removeElement, result, matchedProps, eventName;

                        // Store the old selected event.
                        selected = selectElement.val();

                        // Search event properties
                        if (!matchedProps)
                            matchedProps = node.getMatchingProperties(
                                {'type': 'event'}
                            );

                        // Generate event handlers list.
                        eventHandlersList = $('<fieldset>')
                            .append($('<legend>Event handlers</legend>'))

                        ulElement = $('<ul>').appendTo(eventHandlersList);
                        removeElement = $('<a>')
                            .html('Remove')
                            .button({
                                text: false,
                                icons: {
                                    primary: "ui-icon-trash"
                                }
                            })
                            .click(removeEventHandler);

                        for (eventName in matchedProps) {
                            if (typeof(matchedProps[eventName]) != 'string')
                                continue;
                            if (matchedProps[eventName].trim() == '')
                                continue;
                            aElement = $('<a>')
                                .addClass('link')
                                .html(eventName)
                                .click(eventLinkClicked);
                            liElement = $('<li>')
                                .attr('rel', eventName)
                                // FIXME: Strange behavior here
                                //        removeElement only appended to
                                //        last liElement
                                // .append(removeElement);
                                .append(aElement)
                                .appendTo(ulElement);
                        }
                        ulElement.find('li').append(removeElement);
                        return eventHandlersList;
                    }

                    /*
                     * Construct the page layout
                     */

                    // Page layout initial
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
                        .change(function(e) {
                            formElement.trigger('submit');
                        })
                        .select()
                        .appendTo(leftPannelContainer);

                    // Add a hidden input to store current event name
                    eventElement = $(
                        '<input name="currentEvent" type="hidden" value="" />'
                    ).appendTo(leftPannelContainer);

                    // Initial the event handlers list
                    eventHandlersList = $('<fieldset>')
                        .append($('<legend>Event handlers</legend>'))
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
                    id = node.getProperty('id');
                    formElement = $('<form>')
                        .attr('id', 'eventHandlerDialog')
                        .append(formContainer)
                        .dialog({
                            title: "Event Handlers - "
                                + BWidget.getDisplayLabel(type)
                                + (id ? ' (' + id + ')' : '' ),
                            modal: true,
                            width: 980,
                            height: 600,
                            resizable: false
                         })
                        .bind('refresh', function(e, matchedProps) {
                            if (!matchedProps)
                                matchedProps = node.getMatchingProperties(
                                    {'type': 'event'}
                                );

                            // Regenerate event select options.
                            generateEventSelectElement(
                                eventSelectElement, matchedProps
                            );

                            // Regenerate the event handlers list.
                            eventHandlersList.replaceWith(
                                generateEventHandlersList(
                                    eventSelectElement,matchedProps
                                )
                            );
                        })
                        .bind('dialogclose', function(e) {
                            $(this).trigger('submit');
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
                                // Refresh event handlers list.
                                $(this).trigger('refresh');
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

                                    // Hightlight current event in event
                                    // handlers
                                    eventHandlersList
                                        .find('li.ui-selected')
                                        .removeClass('ui-selected');
                                    eventHandlersList
                                        .find('li[rel="' + formData.selectedEvent + '"]')
                                        .addClass('ui-selected');
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

                        // Initial event handlers list.
                        formElement.trigger('refresh');
                });

            // add delete element button
            $('<button>Delete Element</button>')
                .addClass('buttonStyle')
                .attr('id', "deleteElement")
                .appendTo(buttonsContainer)
                .bind('click', function (e) {
                    var msg, node;
                    node = ADM.getSelectedNode();
                    if (!node) {
                        return false;
                    }
                    if (type === "Page") {
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

            function validValue(node, element, type) {
                var oldValue, cfm, ret = null, value = element.val();
                // When widget that have event handlers, after user make the ID
                // property be blank, then popup a confirm dialog.
                if (element.attr('id') === 'id-value' && element.val() === "" && node.hasEventHandlers()) {
                    oldValue = node.getProperty('id');
                    cfm = confirm(
                        "All event handlers of this widget will stop working"
                        + "and can't be exported if the ID property is empty."
                        + "Are you sure you want to set the ID property to "
                        + "empty?"
                    );
                    if (!cfm) {
                        // Restore to old value.
                        return oldValue;
                    };
                }

                // Parsing the property value with property type
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

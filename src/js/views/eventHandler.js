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
// Event Handler view widget

(function($, undefined) {
    $.widget('rib.eventHandlerView', $.rib.baseView, {
        _create: function() {
            var formContainer, leftPanel, leftPanelContainer,
                rightPanel, eventElement, eventSelectElement,
                eventEditorContainer, eventEditor, formElement,
                jsCode, eventHandlersList,
                o = this.options, e = this.element, self = this,
                uniqueIdName = 'id';

            // Chain up to base class _create()
            $.rib.baseView.prototype._create.call(this);

            /*
             * Construct the page layout
             */
            // Page layout initial
            formContainer = $('<div class="hbox" />');
            leftPanel = $('<div class="flex1 vbox wrap_left" />')
                .appendTo(formContainer)
            rightPanel =$('<div class="flex1 wrap_right" />')
                .appendTo(formContainer)

            /*** Left panel contents ***/

            $('<div class="title"><label>Event</label></div>')
                .appendTo(leftPanel);

            leftPanelContainer = $('<div>')
                .addClass('container propertyItems')
                .appendTo(leftPanel);

            // Construct event options elements
            eventSelectElement = $('<select>')
                .attr({'name': 'selectedEvent'})
                .addClass('center')
                .change(function(e) {
                    formElement.trigger('submit');
                })
                .select()
                .appendTo(leftPanelContainer);

            // Add a hidden input to store current event name
            eventElement = $(
                '<input name="currentEvent" type="hidden" value="" />'
            ).appendTo(leftPanelContainer);

            // Initial the event handlers list
            eventHandlersList = $('<fieldset>')
                .append($('<legend>Event handlers</legend>'))
                .appendTo(leftPanelContainer);

            // Create the DONE button
            $('<button>Done</button>')
                .addClass('buttonStyle doneButton')
                .click( function (e) {
                    self.element.dialog('close');
                })
                .button()
                .appendTo(leftPanelContainer);

            /*** Right panel contents ***/

            $('<div class="title"><label>Javascript Code</label></div>')
                .appendTo(rightPanel);

            // Construct code editor element
            eventEditorContainer = $('<div/>')
                .addClass('container')
                .appendTo(rightPanel);
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
                .append(formContainer)
                .bind('submit', function(e) {
                    e.preventDefault();
                    var node = ADM.getSelectedNode(),
                        formData = $(this).serializeJSON();

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
                        self.refresh(e, self);
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

                this.formElement = formElement;
                this.eventElement = eventElement;
                this.eventSelectElement = eventSelectElement;
                this.eventHandlersList = eventHandlersList;
                this.eventEditor = eventEditor;
                this.element.append(formElement);
                this.element.dialog({
                    modal: true,
                    width: 980,
                    height: 560,
                    resizable: false,
                    autoOpen: false
                })
                .bind('dialogopen', function(e) {
                    if (eventSelectElement.val() == '')
                        self._initialEditorContent(self);
                })
                .bind('dialogclose', function(e) {
                    self.formElement.trigger('submit');
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
            var matchedProps,
                eventElement = widget.element.find('input[name="currentEvent"]'),
                eventSelectElement = widget.element.find('select'),
                eventHandlersList = widget.element.find('fieldset'),
                node = ADM.getSelectedNode(), id = node.getProperty('id');

            // Restore the select element to be blank
            if (event && event.name == 'selectionChanged')
                widget._initialEditorContent(widget);

            // Update dialog title.
            widget.element.dialog({
                title: "Event Handlers - "
                    + BWidget.getDisplayLabel(node.getType())
                    + (id ? ' (' + id + ')' : '' ),
            })

            // Regenerate event select options/list.
            matchedProps = node.getMatchingProperties({'type': 'event'});
            widget._generateEventSelectElement(
                widget, eventSelectElement, node, matchedProps
            );
            widget._generateEventHandlersList(
              widget, eventSelectElement, node, matchedProps
            ).replaceAll(eventHandlersList);
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
            widget.refresh(event, widget);
        },

        _initialEditorContent: function(widget) {
            widget = widget || this;
            widget.eventSelectElement.val('');
            widget.eventElement.val('');
            // Clean up the editor contents and restore it to be read only.
            widget.eventEditor.setValue('');
            widget.eventEditor.setOption('readOnly', 'nocursor');
        },

        /*
         * Elements construction functions.
         */

        // Generate the event property select options.
        _generateEventSelectElement: function(widget, eventSelectElement, node, matchedProps) {
            var selected, newSelectElement, result,
                optionElement, eventName, optionsGroup;

            // If eventSelectElement is not exist then create one, otherwise
            // restore it to initial.
            if (eventSelectElement.length == 0) {
                eventSelectElement = $('<select name="selectedEvent" class="center"></select>');
            } else {
                selected = eventSelectElement.val();
                eventSelectElement.empty();
            }

            // Added a initial blank option;
            $('<option value="">[Select an event handler]</option>')
                .addClass('cm-inactive')
                .appendTo(eventSelectElement);

            // TODO: Classify the events and use optgroup to
            //        genereate it.
            /*
            optionsGroup = $(
                '<optgroup label="[Select an event handler]"></optgroup>'
            )
                .appendTo(eventSelectElement);
            */

            // Generate event select options.
            for (eventName in matchedProps) {
                optionElement = $('<option>')
                    .attr('value', eventName)
                    .html(eventName)
                    .appendTo(eventSelectElement);

                // If the event is selcted, then check it to be
                // selected again.
                if (eventName === selected)
                    optionElement.attr('selected', 'selected');

                // If the event have codes, then highlight it.
                if (typeof(matchedProps[eventName]) !== 'string')
                    continue;
                if (matchedProps[eventName].trim() === '')
                    continue;
                optionElement.addClass('cm-active');
                optionElement.html(optionElement.html() + ' *');
            }
            return eventSelectElement;
        },

        // Generate the event event handler that had codes list area.
        _generateEventHandlersList: function(widget, eventSelectElement, node, matchedProps) {
            var selected, ulElement, liElement, aElement,
                removeElement, result, eventName, eventHandlersList,
                self = this;
            var switchEventHandler = function(e) {
                e.preventDefault();
                var self = $(this), parent = self.parent(),
                    eventName = self.parent().attr('rel');
                // Highlight current line.
                parent.parent().find('.ui-selected').removeClass('ui-selected');
                parent.addClass('ui-selected');
                // Set the event handler editor.
                widget.eventSelectElement.val(eventName);
                widget.eventSelectElement.trigger('change');
            },
            removeEventHandler = function(e) {
                e.preventDefault();
                var eventName = $(this).parent().attr('rel');
                $.rib.confirm(
                    'Are you sure you want to delete the '
                        + eventName
                        + ' event handler?',
                    function() {
                        node.setProperty(eventName, '');
                        if (widget.eventElement.val() == eventName) {
                            widget.eventSelectElement.val('');
                            widget.eventEditor.setValue('');
                        }
                        widget.formElement.trigger('submit');
                    }
                );
            };
            // Store the old selected event.
            selected = eventSelectElement.val();

            // Generate event handlers list.
            eventHandlersList = $('<fieldset>')
                .append($('<legend>Event handlers</legend>'))

            ulElement = $('<ul>').appendTo(eventHandlersList);
            for (eventName in matchedProps) {
                if (typeof(matchedProps[eventName]) !== 'string')
                    continue;
                if (matchedProps[eventName].trim() === '')
                    continue;
                aElement = $('<a>')
                    .addClass('link')
                    .html(eventName)
                    .click(switchEventHandler);
                liElement = $('<li>')
                    .attr('rel', eventName)
                    // FIXME: Strange behavior here
                    //        removeElement only appended to
                    //        last liElement
                    // .append(removeElement);
                    .append(aElement)
                    .appendTo(ulElement);
                if (selected == eventName)
                    liElement.addClass('ui-selected');
            }
            removeElement = $('<div class="delete button">Delete</div>')
                .click(removeEventHandler);
            ulElement.find('li').append(removeElement);
            return eventHandlersList;
        }
    })
})(jQuery);

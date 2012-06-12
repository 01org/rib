/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

/*
 * The code is a forked version from the jQuery dialogBox original -
 * https://github.com/xuqingkuang/jquery-dialogbox
 *
 * Here is a jQuery UI plugin version, but it's buggy and can not 
 * meet our requirements - https://github.com/xuqingkuang/jquery-ui-dialogbox
 *
 */

/**

JQuery Dialog Box - Class used for build the common dialogs based on
                    JQuery UI Dialog component.

(c) 2012 Xuqing Kuang <xuqingkuang [at] gmail.com>
Licenced under the Apache licences

Requirements:
   1. jQuery > 1.6
   2. jQuery UI

Simple Usage:
   1. Replace alert built in browser.
   >> $.rib.dialogBox.overrideAlert();
   >> alert('Hello jQuery!');

   2. Simply alert like dialog.
   >> $.rib.dialogBox('Hello jQuery!', 'alert');

   3. Popup the dialog with options, for more info, see defaultOptions.
   >> $.rib.dialogBox({
        'type': 'yesno', // Dialog type - alert, confirm, prompt, yesno
        'content': 'Hello jQuery', // Dialog content.
     })

   5. The usage as same as jQuery UI Dialog
   >> $('<span>Hello</span>').dialogBox({'type': 'confirm'})

All of options are compatible with jQuery UI Dialog component.

For more information, see README.md in original repo.

**/

(function($, undefined) {
    var dialogBox = {
        /*
         * The default options
         * It will be cloned each time.
         */
        defaultOptions: {
            // Values built-in, following values need to defined to false
            // because of undefined is using to check the key exists.
            'type': 'alert',
            'title': false,
            'content': '',
            // 'async': false,     FIXME: The feature is not ready yet.
            'modal': true,
            
            // Elements, it could be override
            'inputElement': $('<input>').attr({
                'type': 'text',
                'name': 'input'
            }),
            
            // Callback for default elements clicked
            'confirmCallback': false,
        },
        
        
        /*
         * Functions
         */
        constructDialogFormElements: function(options) {
            // initial elements
            var dialogFormElement = $('<form>').attr({
                'class': 'dialogBoxForm',
            });

            var dialogButtons = options['buttons'] || {};
            var dialogButtonLables = {
                'confirm': 'Ok',
                'cancel': 'Cancel',
                'yes': 'Yes',
                'no': 'No'
            };
            var confirmBtnCallback = function(e) {
                dialogFormElement.trigger('submit');
                return true;
            };
            var cancelBtnCallback = function(e) {
                dialogFormElement.remove();
                return false;
            };
            
            // Define the events callback
            if(options.confirmCallback) {
                dialogFormElement.submit(options.confirmCallback);
            } else {
                dialogFormElement.submit(function(e) {
                    e.preventDefault();
                    var serializedArray = $(this).serializeArray();
                    dialogFormElement.remove();
                    return serializedArray;
                })
            }
            
            // Fill the content to content
            dialogFormElement.html(options.content);
            
            // Check the 
            if(options['type']) {
                switch (options['type']) {
                    case 'alert':
                        if(!options.title) {
                            options.title = 'Alert!';
                        }
                        dialogButtons[dialogButtonLables['confirm']]
                            = confirmBtnCallback;
                        break;
                    case 'confirm':
                        if(!options.title) {
                            options.title = 'Could you confirm it?';
                        }
                        dialogButtons[dialogButtonLables['confirm']]
                            = confirmBtnCallback;
                        dialogButtons[dialogButtonLables['cancel']]
                            = cancelBtnCallback;
                        break;
                    case 'prompt':
                        if(!options.title) {
                            options.title = 'Are you sure?';
                        }
                        dialogFormElement.append(options.inputElement);
                        dialogButtons[dialogButtonLables['confirm']]
                            = confirmBtnCallback;
                        dialogButtons[dialogButtonLables['cancel']]
                            = cancelBtnCallback;
                        break;
                    case 'yesno':
                        if(!options.title) {
                            options.title = 'Please decide?';
                        }
                        dialogButtons[dialogButtonLables['yes']]
                            = confirmBtnCallback;
                        dialogButtons[dialogButtonLables['no']]
                            = cancelBtnCallback;
                        break;
                    default:
                        // Default by alert behavior
                        if(!options.title) {
                            options.title = 'Alert!';
                        }
                        dialogButtons[dialogButtonLables['confirm']]
                            = confirmBtnCallback;
                        break;
                }
            }
            options['buttons'] = dialogButtons;
            $('body').append(dialogFormElement);
            dialogFormElement.dialog(options);
            // FIXME: Pause the javascript process here,
            //        but seems it's impossible.

            // Finalize
            return dialogFormElement;
        },
        
        overrideAlert: function() {
            window.alert = function(content) {
                dialogBox.run(content);
            };
        },
        
        parseOptions: function(options, type) {
            // Options checking
            if(['undefined', 'string', 'object']
                .indexOf(typeof(options)) < 0)
             {
                throw 'TypeError: options must be string or object if defined.';
            }
            if(['undefined', 'function']
                .indexOf(typeof(options.confirmCallback)) < 0
            ) {
                throw 'TypeError: confirmBtnClickedCallback must be function if defined.';
            };
            
            // Clone the options with the key exists in defaultOptions
            options = options || {};
            var newOptions = $.extend(true, {}, dialogBox.defaultOptions);
            if (typeof(options) == 'string') {
                newOptions['content'] = options;
                if(typeof(type) == 'string') {
                    newOptions['type'] = type;
                }
            } else {
                $.extend(true, newOptions, options);
            }
            
            return newOptions;
        },
        
        run: function(options, type) {
            options = dialogBox.parseOptions(options, type);
            return dialogBox.constructDialogFormElements(options);
        },
    };
    
    // Setup the jQuery plugin methods
    $.fn.dialogBox = function(options) {
        var optionsType = typeof(options);
        if(['undefined', 'object'].indexOf(optionsType) < 0) {
            throw 'TypeError: options must be object if defind';
        }
        options = options || {};
        options['content'] = $(this).html();
        dialogBox.run(options);
    };

    /*******************  export dialogBox to $.rib **********************/
    $.rib = $.rib || {};
    $.rib.dialogBox = dialogBox.run;
    $.rib.dialogBox.overrideAlert = dialogBox.overrideAlert;
})( jQuery );

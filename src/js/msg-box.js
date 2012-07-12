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

$.rib = $.rib || {};
/**
 * Show a simple message box
 *
 * @param {String} msg The message that needs to be shown
 * @param {Object} buttons The buttons to be shown in the dialog
 *                         and their corresponding callbacks
 *                         For example: {'OK': callback1; "Cancel": callback2}
 * @return {None}.
 */
$.rib.msgbox = function (msg, buttons){
    var dlg = $("<div/>").append('<p class="title">'
            + msg + '</p>'),
        buttonSet;
    var i = 0;
    if (buttons) {
        buttonSet = $('<div id="buttonSet"/>').appendTo(dlg);
        $.each(buttons, function (caption, callback) {
                buttonSet.append($('<button class="buttonStyle"/>')
                    .text(caption)
                    .bind('click', function () {
                        if (typeof callback === "function")
                            callback();
                        dlg.dialog('close')
                    }));
        });
    }
    dlg.dialog({modal:true});
};

window.alert =  function (msg) {
    $.rib.msgbox(msg, {"OK": null});
}

var old_confirm = window.confirm;
/**
 * Override confirm for prettier UI.
 * Note that if only one parameter is supplied, original confirm will be called.
 * Callbacks are used here because there is no way to block the execution of
 * script and wait for the user to choose "yes" or "no" in the customized dialog
 *
 * @param {String} msg The message that needs to be shown
 * @param {function()=} ok_handler Callback when "OK" button is clicked
 * @param {function()=} cancel_handler Callback when "Cancel" button is clicked
 * @return {Boolean/None} The same as original confirm if only one parameter is
 *                        is supplied. None if more than one parameter is
 *                        supplied.
 */
window.confirm = function (msg, ok_handler, cancel_handler ) {
    if (ok_handler) {
       $.rib.msgbox(msg, {'Cancel': cancel_handler, 'OK': ok_handler});
    }
    else
        return old_confirm(msg)
}


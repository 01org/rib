$.rib = $.rib || {};
$.rib.msgbox = function (){
    var dlg = $("<div/>").append('<center class="title">'
            + arguments[0] + '</center>'),
        buttons = arguments[1], buttonSet;
    if (buttons) {
        buttonSet = $('<div align="center" id="buttonSet" />').appendTo(dlg);
        $.each(buttons, function (name, value) {
                buttonSet.append($('<button class="buttonStyle"/>')
                    .text(name)
                    .bind('click', value)
                    .bind('click', function () {dlg.dialog('close')}));
        });
    }
    dlg.dialog();
};

window.alert =  function (msg) {
    $.rib.msgbox(msg, {"OK": null});
}

var old_confirm = window.confirm;
window.confirm = function () {
    if (arguments.length > 1) {
       $.rib.msgbox(arguments[0], {'Continue': arguments[1], 'Cancel': arguments[2]});
    }
    else
        return old_confirm(arguments[0]);
}


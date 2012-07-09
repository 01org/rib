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

// Project view widget

(function($, undefined) {

    $.widget('rib.projectView', $.rib.baseView, {

        options: {
            projectDialog: null
        },

        _create: function() {
            var o = this.options,
                e = this.element,
                widget = this;

            // Chain up to base class _create()
            $.rib.baseView.prototype._create.call(this);

            $('<div/>').addClass(this.widgetName)
                .appendTo(this.element);

            // Add a hidden file input element, used to trigger the browsers
            // native file browse/find dialog when user wants to import a new
            // project file into the RIB application
            $('<input type="file"/>')
                .attr({id:'importFile'})
                .addClass('hidden-accessible')
                .change(widget._importChangedCallback)
                .appendTo(this.element[0].ownerDocument.body);

            // Add a project setting dialog element, used to configure
            // project setting at creation, or to modify them later.
            this.options.projectDialog =  this._createSettingDialog();

            return this;
        },

        _importChangedCallback: function (e) {
            var file;
            if (e.currentTarget.files.length === 1) {
                file = e.currentTarget.files[0];
                $.rib.pmUtils.importProject(file, function () {
                    // show the layout tab
                    $(document.body).tabs('select', 1);
                });
            } else {
                if (e.currentTarget.files.length <= 1) {
                    console.warn("No files specified to import");
                } else {
                    console.warn("Multiple file import not supported");
                }
            }
            // Clear the value
            $(e.currentTarget).val('');
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
            var pidArr, stage, container;
            widget = widget || this;
            container = $('.projectView').last();
            container.empty();
            //get project counts from PM-API
            pidArr = $.rib.pmUtils.listAllProject();
            if(!pidArr){
                console.error("Error: failed to list all projects.");
            }
            $.each(pidArr, function(index, value){
                // value is an object contains {"pid":XX, "date":XXX}
                widget.createProjectBox(value.pid, container, widget);
            });
            // Mark the active project box
            $('#'+$.rib.pmUtils.getActive(), container)
                .addClass('ui-state-active');
        },

        // Private functions
        _dialogOpenHandler: function (e, ui) {
           try {
                var name = "Untitled", isCreate, dialog, id, t,
                    pmUtils = $.rib.pmUtils, currentTheme = "Default",
                    pid, themeNames;
                dialog = this.options && this.options.projectDialog;
                dialog = dialog || $(this).dialog('option', 'projectDialog');
                isCreate = dialog.data('new-project-dialog');
                pid = pmUtils.getActive();
                if (pid) {
                    name = pmUtils.getProperty(pid, "name");
                    currentTheme = pmUtils.getProperty(pid, "theme");
                }
                //clear all items in list of themes
                $('#themePicker', dialog).empty();
                // Insert the list of themes
                themeNames = pmUtils.getAllThemes();
                for (t in themeNames) {
                    id = themeNames[t];
                    $('<option id="'+ id +'" value="' + id + '">'+ id + '</option>')
                        .appendTo('#themePicker', dialog);
                }
                //make sure current theme of project is selected
                $('#themePicker', dialog).val(currentTheme);
                $("#projectName", dialog).val((isCreate)?'':name);
                $(".ui-button-text", dialog).text((isCreate)?'Next':'Done');
            } catch (err) {
                console.error(err.message);
                return false;
            }
        },

        _dialogCloseHandler: function (e, ui) {
            try {
                var opts = {}, isCreate, dialog;
                dialog = this.options && this.options.projectDialog;
                dialog = dialog || $(this).dialog('option', 'projectDialog');
                isCreate = dialog.data('new-project-dialog');
                opts.name = $("#projectName", dialog).val()|| "Untitled";
                opts.theme = $("#themePicker", dialog).val() || "Default";

                if (isCreate) {
                    //call project API to create a new project
                    $.rib.pmUtils.createProject(opts, function() {
                        // show the layout tab
                        $(document.body).tabs('select', 1);
                    });
                } else {
                    //call project API to update current project
                    $.rib.pmUtils.setProperties($.rib.pmUtils.getActive(), opts);
                    $(':rib-projectView').projectView('refresh');
                }
                // Blank out the title
                dialog && $('#projectName', dialog).val('');
                dialog && dialog.dialog("close");
                return true;
            }
            catch (err) {
                console.error(err.message);
                return false;
            }
        },

        _createPrimaryTools: function() {
            var tools;
            tools = $('<div/>').addClass('hbox').hide()
                .append('<button id="newProj"></button>')
                .append('<button id="importProj"></button>');
            tools.children().addClass('buttonStyle ui-state-default')
                .first().click(this, function(e) {
                    var d = e.data.options.projectDialog;
                    d.dialog('option', 'title', 'New Project')
                        .data('new-project-dialog',true)
                        .dialog("open");
            });
            return tools;
        },

        _createSecondaryTools: function() {
            $('#setProj',document.body).click(this, function(e){
                var d = e.data.options.projectDialog;
                d.dialog('option', 'title', 'Project Settings')
                    .data('new-project-dialog',false)
                    .dialog("open");
                e.stopPropagation();
            })
            return [];
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            // if the designDirty is false, then set it
            if (!($.rib.pmUtils.designDirty)) {
                $.rib.pmUtils.designDirty = true;
            }
        },

        _createSettingDialog: function() {
            var projectDialog = this.options.projectDialog,
                themeNames, pmUtils = $.rib.pmUtils;

            projectDialog = $('<div/>')
                .addClass('ribDialog')
                .appendTo(this.element[0].ownerDocument.body);
            $('<div/>').addClass('hbox')
                .append('<div/>')
                .children(':first')
                .addClass('flex1 vbox wrap_left')
                .append('<form><legend/><ul>' +
                    '<li class="mt23"><label for="name">Project Name</label>' +
                    '<input type ="text" id="projectName" value=""/></li>' +
                    '<li class="mt23"><label for="name">Theme</label>' +
                    '<select id="themePicker" size="4"></select></li>' +
                    '<li class="mt50"><u id="uploadTheme" class="fr mr40">' +
                    'Upload Theme</u></li>' +
                    '</ul></form><div class="div-bottom"></div>')
                .end()
                .append('<div/>')
                .children(':last')
                .addClass('flex1 wrap_right')
                .end()
                .appendTo(projectDialog, this);

            $(document).delegate('#uploadTheme', "click", function () {
                var success = $.rib.pmUtils.uploadTheme;
                $.rib.fsUtils.upload('css', projectDialog, function(file) {
                    pmUtils.uploadTheme(file);
                    //if file.name isn't in theme select list, add it to the list
                    //else do nothing
                    var themeName = file.name.replace(/.css$/g, "");
                    themeNames = pmUtils.getAllThemes();
                    if (jQuery.inArray(themeName, themeNames) === -1) {
                        themeNames.push(themeName);
                        $('<option id="'+ themeName +'" value="' +
                            themeName + '">'+ themeName + '</option>')
                            .appendTo('#themePicker', projectDialog);
                    }
                });
            });
            projectDialog.dialog({
                autoOpen: false,
                modal: true,
                height: 489,
                width: 770,
                resizable: false,
                title: "New Project",
                buttons: { 'Next': this._dialogCloseHandler },
                open: this._dialogOpenHandler
                });

            // Call our close handler onSubmit, not default action
            projectDialog.find('form').submit(this, function(e) {
                e.stopImmediatePropagation();
                e.preventDefault();
                if (e && e.data && e.data._dialogCloseHandler) {
                    return e.data._dialogCloseHandler(e);
                }
                return false;
            });

            // Reparent the jquery-ui dialog button pane into our div so we
            // can acheive the desired layout (See pg 6 of the UI spec).
            $('.ui-dialog-buttonpane',$(projectDialog).dialog('widget'))
                .detach()
                .appendTo(projectDialog.find('.div-bottom'));
            $('.ui-button-text', projectDialog.dialog('widget'))
                .addClass('buttonStyle');
            return projectDialog;
        },

        createProjectBox: function(pid, container, widget) {
            var box, title, content, thumbnail, imgPath, rightSide,
                openHandler, cloneHandler, deleteHandler;
            widget = widget || this;
            container = container || $('.projectView').last();
            openHandler = function () {
                var success = function () {
                    // show the layout tab
                    $(document.body).tabs('select', 1);
                };
                $.rib.pmUtils.openProject(pid, success);
            };
            cloneHandler = function () {
                var success = function (destPid) {
                    widget.refresh();
                };
                $.rib.pmUtils.cloneProject(pid, success);
            };
            deleteHandler = function () {
                var success = function (pid) {
                    widget.refresh();
                    // If the deleted project it the active project
                    // or there is no project then find the last opened project
                    // and open it, create a new project in no project case
                    if (!$.rib.pmUtils.getActive()) {
                        $(document.body).one("tabsselect", function (e, tab) {
                            if (tab.index === 1) {
                                $.rib.pmUtils.showLastOpened();
                            }
                        });
                    }
                };
                var continueToDelete = confirm("Are you sure you want to delete it?");
                if(continueToDelete) {
                    $.rib.pmUtils.deleteProject(pid, success);
                }
            };
            // draw project box
            box = $('<div/>').attr('id',pid)
                             .addClass('projectBox vbox')
                             .appendTo(container);
            title = $('<div />').addClass('titleBar flex0')
                        .append('<span>' + $.rib.pmUtils.getProperty(pid, "name") + '</span>')
                        .append($('<div class="openButton"></div>').click(openHandler))
                        .appendTo(box);
            content = $('<div />').addClass('content flex1 hbox')
                      .appendTo(box);
            //TODO: imgPath = pmUtils.getProperty(pid, "thumbnail");
            imgPath = 'src/css/images/emptyProjectThumbnail.png';
            thumbnail= $('<img />').attr('src', imgPath);
            $('<div />').addClass('thumbnail flex1')
                        .append(thumbnail)
                        .appendTo(content);
            $('<div />').addClass("rightSide flex1")
                        .append('<b>LAST OPENED</b><br />')
                        .append('<span>' + ($.rib.pmUtils.getProperty(pid, "accessDate")).toString().slice(4, 24) + '</span>')
                        // apend clone button
                        .append($('<div>Clone</div>').addClass("clone button").click(cloneHandler))
                        // apend delete button
                        .append($('<div>Delete</div>').addClass("delete button").click(deleteHandler))
                        .appendTo(content);
        }
    });
})(jQuery);

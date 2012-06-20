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

// Outline view widget

(function($, undefined) {

    $.widget('rib.outlineView', $.rib.treeView, {

        _create: function() {
            var o = this.options,
                e = this.element;

            // Chain up to base class _create()
            $.rib.treeView.prototype._create.call(this);

            $(window).resize(this, function(event) {
                var el = event.data.element;
                if (el.parent().height() == 0)
                    return;
                var newHeight = Math.round((el.parent().height()
                                -el.parent().find('.pageView').height()
                                - el.parent().find('.property_title')
                                      .height()
                                - 20) // height of ui-state-default + borders
                                * 0.6);
                el.height(newHeight);
            });

            this.enableKeyNavigation();

            return this;
        },

        _selectionChangedHandler: function(event, widget) {
            var node, rootNode, nodeInOutline, currentNode;

            widget = widget || this;

            if (!widget.options.model) {
                return;
            }

            // Make sure we show the page as selected if no node is selected
            if (event === null || event.node === null) {
                node = widget.options.model.getDesignRoot()
                             .findNodeByUid(widget.options.model.getSelected());
                if (node === null || node === undefined) {
                    node = widget.options.model.getActivePage();
                    if (node === null || node === undefined) {
                        return false;
                    }
                }
            } else {
                node = event.node;
            }

            // When a page is selected, we will close all other page subtrees
            // and ensure the selected pages' subtree is opened
            if (node.getType() === 'Page') {
                // node is <a> element, need the "folder" <span> before it
                var fldr = widget.findDomNode(node).find('> .folder').eq(0);
                // "Close" all other page folders
                $('>ul>li>span.folder:not(.close)', widget.element).not(fldr)
                    .trigger('click');
                // Make sure this page folder is "Open"
                if (fldr.hasClass('close')) {
                    fldr.trigger('click');
                }
            }
            widget.setSelected(node);
        },

        removeNode: function(node, parentNode) {
            $.rib.treeView.prototype.removeNode.call(this, node);
            parentNode = parentNode || node.getParent();
            if (parentNode.getChildren().length === 0 ||
                (parentNode.getChildren().length === 1 &&
                 parentNode.getChildren()[0] === node)) {
                this.element.find('li.label').filter( function () {
                    return $(this).data('adm-node') === parentNode;
                }).remove();
            }
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            switch (event.type) {
            case "nodeAdded":
                widget.addNode(event.node);
                break;
            case "nodeRemoved":
                widget.removeNode(event.node, event.parent);
                break;
            case "nodeMoved":
                widget.moveNode(event.node, event.oldParent);
                break;
            case "propertyChanged":
                widget.removeNode(event.node);
                widget.addNode(event.node);
                widget.setSelected(widget._getSelected());
                break;
            default:
                console.warning('Unknown type of modelUpdated event:'
                                + event.type);
                break;
            }
        },
        _getParent: function (node) {
            return node.getParent();
        },
        _getChildTreeNodes: function (node) {
            node = node || this.options.model.getDesignRoot();
            var children =  this._adm2TreeModel(node);
            if ($.isArray(children))
                return children;
            else
                return children[BWidget.getDisplayLabel(node.getType())];
        },

        _adm2TreeModel: function (admNode) {
            var treeNode = {},
                childNodes = [],
                children, i, type, showInOutline, label;

            if (!(admNode instanceof ADMNode)) {
                return treeNode;
            }

            type = admNode.getType();
            showInOutline = BWidget.isPaletteWidget(type) ||
                (type === "Page");
            label = BWidget.getDisplayLabel(type);
            if (showInOutline) {
                treeNode[label] = childNodes;
                treeNode._origin_node = admNode;
            }
            else
                treeNode = childNodes;

            children = admNode.getChildren();
            for (i = 0; i < children.length; i++) {
                var childTreeModel = this._adm2TreeModel(children[i]);
                if ($.isPlainObject(childTreeModel))
                    childNodes.push(childTreeModel);
                else
                    $.merge(childNodes, childTreeModel);
            }
            return treeNode;
        },
        _toTreeModel: function (model) {
            return this._adm2TreeModel(model.getDesignRoot());
        },
        _getSelected: function () {
            var model = this.options.model;
            return model.getSelectedNode() || model.getActivePage();
        },
        _renderPageNode: function (domNode, node) {
            if (node.getType() === "Page") {
                domNode.addClass('nrc-sortable-container');
                //set page id
                var id = node.getProperty('id'),
                    titleNode = domNode.find("> a > .pageTitle");
                if (titleNode.length === 0)
                    titleNode = $('<span/>').addClass('pageTitle')
                        .appendTo(domNode.find("> a"));
                titleNode.text(' (' + id + ')');
            }
        },
        _render: function (domNode, data) {
            var labelFunc, parentNode = data.getParent(), newTopLevelNode;
            labelFunc = BWidget.getOutlineLabelFunction(parentNode.getType());
            if (labelFunc) {
                var label = labelFunc(parentNode), prev=domNode.prev(),
                    next = domNode.next();

                // Make sure "border" nodes are not put into other blocks
                if (prev.is('li.label') && prev.data('adm-node') !== parentNode)
                    domNode.insertBefore(prev);
                if (next.is('li.label') && next.data('adm-node') === parentNode)
                    domNode.insertAfter(next);
                if (label && this.findChildDomNodes(parentNode).length === 1)
                    $('<li class="label">' + label + '</li>')
                        .insertBefore(domNode).data('adm-node', parentNode);
            }
            this._renderPageNode(domNode, data);
            $(domNode).addClass('adm-node');
            //attach UID to domNode
            $(domNode).attr('data-uid', data.getUid());
            // If this node is a "container", make sure it's class reflects this
            if (data.isContainer() || data.getType() === 'Header') {
                $(domNode).addClass('nrc-sortable-container');
                if (data.getChildrenCount() === 0) {
                    $(domNode).addClass('empty');
                } else {
                    $(domNode).removeClass('empty')
                }
            }
        },
        _nodeSelected: function (treeModelNode, data) {
            this.options.model.setSelected(data.getUid());
        },
        refresh: function(event, widget) {
            var targets, debug = (window.top.$.rib && window.top.$.rib.debug()),
                widget = widget || this;
            // Chain up to base class refresh()
            $.rib.treeView.prototype.refresh.apply(this, arguments);
            targets =  widget.element.find(".adm-node", this).andSelf();
            targets.sortable({
                    distance: 1,
                    forceHelperSize: true,
                    forcePlaceholderSize: true,
                    placeholder: 'ui-state-highlight',
                    appendTo: 'parent',
                    helper: 'clone',
                    connectWith: '.nrc-sortable-container',
                    cancel: '> :not(.adm-node)',
                    items: '.adm-node',
                    tolerance: 'pointer',
                    sort: function(event, ui){
                        // Workaround a jQuery UI bug which doesn't take scrollTop
                        // into accounting when checking if mouse is near top or
                        // bottom of the sortable
                        var s = $(this).data('sortable'), sP = s.scrollParent;
                        if(sP[0] != document && sP[0].tagName != 'HTML') {
                            s.overflowOffset.top = sP.offset().top+sP[0].scrollTop;
                            // Hackish solution to cheat jquery UI so that
                            // horizontal scroll will never happen. Note that we
                            // can't use axis:'x' to solve the problem, as it
                            // tolltaly forbid horizontal moving, which will cause
                            // some problems, e.g, moving widgets to right blocks
                            // of Grid will be impossible
                            s.overflowOffset.left = sP.offsetWidth/2
                                - s.options.scrollSensitivity;
                        }

                        targets.removeClass('ui-state-active');
                        // The highlighted container should always be where the
                        // placeholder is located
                        ui.placeholder.closest('.nrc-sortable-container')
                            .addClass('ui-state-active');
                    },
                    over: function(event, ui){
                        if (ui && ui.placeholder) {
                            var s = ui.placeholder.siblings('.adm-node:visible'),
                                p = ui.placeholder.parent();
                            if (p.hasClass('ui-content')) {
                                ui.placeholder.css('width', p.width());
                            } else if (p.hasClass('ui-header')) {
                                if (s.length && s.eq(0).width()) {
                                    ui.placeholder.css('width', s.eq(0).width());
                                    ui.placeholder.css('display',
                                            s.eq(0).css('display'));
                                } else {
                                    ui.placeholder.css('width', '128px');
                                }
                            } else if (s.length && s.eq(0).width()) {
                                ui.placeholder.css('width', s.eq(0).width());
                                ui.placeholder.css('display',
                                        s.eq(0).css('display'));
                            } else {
                                ui.placeholder.css('width', p.width());
                            }
                        }
                    },
                    stop: function(event, ui) {
                        var node = null,
                            adm = window.parent.ADM,
                            bw = window.parent.BWidget,
                            root = adm.getDesignRoot(),
                            node, zones, newParent, newZone,
                            idx, cid, pid, card, type;
                        $(this).removeClass('ui-state-active');
                        if (!ui.item) return;
                        idx = ui.item.parent().children('.adm-node')
                              .index(ui.item);
                        cid = ui.item.attr('data-uid');
                        // closest() will select current element if it matches
                        // the selector, so we start with its parent.
                        pid = ui.item.parent()
                            .closest('.adm-node.ui-sortable')
                            .attr('data-uid');
                        if (!pid) {
                            //set design root as the parent of page
                            pid = root.getUid();
                        }
                        node = cid && root.findNodeByUid(cid);
                        type = node.getType();
                        newParent = pid && root.findNodeByUid(pid);
                        if (newParent && newParent.getType() === 'Page' &&
                            type !== 'Header' && type !== 'Footer') {
                            if (newParent.getZoneArray('top')[0]) {
                                idx = idx -1;
                            }
                            newParent = newParent.getZoneArray('content')[0];
                        }
                        zones = newParent && bw.getZones(newParent.getType());
                        card = newParent && zones &&
                            bw.getZoneCardinality(newParent.getType(),
                                    zones[0]);

                        if ((zones && zones.length===1 && card !== '1')) {
                            if (!node ||
                                    !adm.moveNode(node, newParent, zones[0],
                                        idx)) {
                                console.warn('Move node failed');
                                ui.item.remove();
                                return false;
                            } else {
                                debug && console.log('Moved node');
                                if (node) adm.setSelected(node.getUid());
                                widget.refresh();
                            }
                        } else if (node && newParent &&
                                (newParent.getType() === 'Header' ||
                                 newParent.getType() === 'Page')) {
                            for (var z=0; z < zones.length; z++) {
                                if (adm.moveNode(node, newParent, zones[z],
                                            0, true)) {
                                    newZone = zones[z];
                                    break;
                                }
                            }
                            if (newZone) {
                                adm.moveNode(node, newParent, newZone, 0);
                                debug && console.log('Moved node');
                                if (node) adm.setSelected(node.getUid());
                                widget.refresh();
                            } else {
                                console.warn('Move node failed');
                                ui.item.remove();
                                return false;
                            }
                        } else {
                            console.warn('Move node failed: invalid zone');
                            ui.item.remove();
                            return false;
                        }
                    },
                });
        },
    });
})(jQuery);

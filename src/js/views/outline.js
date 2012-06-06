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
    $.widget('rib.outlineView', $.rib.baseView, {
        _create: function() {
		    var o = this.options,
			    e = this.element,
			    self = this;
				// Chain up to base class _create()
        $.rib.treeView.prototype._create.call(this);
            $(window).resize(this, function(event) {
				var el = event.data.element;
				if(el.parent().height() == 0)
				return;
				var newHeight = Math.round((el.parent().height()
						- el.parent().find('.pageView').height()
						- el.parent().find('.property_title').height()
						- 20) // height of ui-state-default + borders
					* 0.6);
				el.height(newHeight);
				});
			// ToDo do this in css
			e.css('overflow','auto');
			return this;
		},

		//override
        _init: function(){},

        _selectionChangedHandler: function(event, widget) {
            var node, rootNode, nodeInOutline, currentNode;
			widget = widget || this;
			if(!widget.options.model) {
				return;
			}
			// Make sure we show the page as selected if no node is selected   >>>old code
			if (event === null || event.node === null) {
				node = widget.options.model.getDesignRoot().findNodeByUid(widget.options.model.getSelected());
				if (node === null || node === undefined) {
					node = widget.options.model.getActivePage();
					if (node === null || node === undefined) {
						return;
					}
				}
			} else {
				node = event.node;
			}

			widget.select_node(node);
		},

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
			switch (event.type) {
				case "nodeAdded":
					widget._node_add(event.node, widget);
					break;
				case "nodeRemoved":
					widget.delete_node(widget._getTreenode(event.node));
					break;
				case "nodeMoved":
					widget.delete_node(widget._getTreenode(event.node));
					widget._node_add(event.node, widget);
					break;
				case "propertyChanged":
					//should we catch this?
					/*
					var props = event.node.getProperties();
					if (props.text) {
						widget.rename_node(widget._getTreenode(event.node), props.text);
					} else{
						widget.refresh();
					}
					*/
					break;
				default:
					console.warn('Unknown type of modelUpdated event:'
							+ event.type);
					break;
			}
	    },
        refresh: function(event, widget, admModel) {
            var widget = widget || this,
			jstree = $.jstree._reference(widget.element), treeModel;

			if(admModel && admModel.getType() !== "Design") {
				treeModel = widget._treeModel(admModel);
			} else if(widget.options.model) {
				treeModel = widget._DesignTreeModel(widget.options.model.getDesignRoot());
			} else {
				console.error("No DesignRoot ");
				return;
			}
			//First destroy the jstree
			if(jstree)
				jstree.destroy();
			//and then  construct a new jstree .
			this._render(this.element, treeModel);
		},
        /*
		 * ADMNode to TreeNode 
		 */
        _treeModel: function(admNode) {
            var treeModel = {}, children, i, uid,
                title, props = admNode.getProperties();

			if (admNode instanceof ADMNode) {
				uid = admNode.getUid();
				title = (!props.text) ? admNode.getType() : props.text;
				treeModel.data = {};
				// change the title you want
				treeModel.data.title = title;
				//omit 'attr' if not need ; the object gets passed to the jQuery 'attr' function
				treeModel.data.attr = {
					"id" : 'treenode_' + uid,
					"tree_uid" : uid
				};
				//treeModel.state = "closed";
				treeModel.children = [];
				treeModel.uid = uid;
				// Recurse to fill children array
				children = admNode.getChildren();
				if (children.length > 0) {
					if (admNode.getType() === "Page") {
						var header, content, footer;
						header = admNode.getZoneArray('top');
						content = admNode.getZoneArray('content');
						footer = admNode.getZoneArray('bottom');
						children = [];
						$.merge(children, header);
						$.merge(children, content[0].getChildren());
						$.merge(children, footer);
					}
					for ( i = 0; i < children.length; i++) {
						treeModel.children[i] = this._treeModel(children[i]);
					}
				}
				return treeModel;
			} else {
				console.warn("warning:Must be a admNode");
				return null;
			}
        },

        /*
         * DesignRoot to TreeNode
         */
        _DesignTreeModel: function(DesignRoot) {
            var DesignRoot = DesignRoot || ADM.getDesignRoot(),
                children = DesignRoot.getChildren(), length = children.length,
                i, treeModel = [];

			for ( i = 0; i < length; i++) {
				treeModel[i] = this._treeModel(children[i]);
			}
			return treeModel;
		},

        _render: function(element,treeModel) {
			var o = this.options, e = this.element,
                designRoot = o.model.getDesignRoot(),
                self = this, treeModel = treeModel || o.treeModel;

			e.jstree({
					"crrm" : {
					"move" : {
					"check_move" : function(m) {

					// get the origin parent
					var p = this._get_parent(m.o),
					    designRoot = ADM.getDesignRoot(),
					    index = m.cp, i,flag = 0,
					    oref = designRoot.findNodeByUid(m.o.find('a:first').attr("tree_uid")),
					    orefType =  oref.getType(),
					    pref = designRoot.findNodeByUid(m.np.find('a:first').attr("tree_uid")),
					    prefType =  pref.getType();
                    if (!p)
					    return false;
					p = p == -1 ? this.get_container() : p;
                    //First: Page can be moved always and only Page can be moved in container
                    if (m.np === this.get_container()) {
                        if(orefType === "Page") {
						    return true;
						} else {
							return false;
						}
					} else{
						//Second: pref.getType() === "Page" >> header footer and content sons
						if (pref.getType() === "Page") {
							if (orefType === "Header" || orefType === "Footer") {
								//Header and Foot can only move between page
								if (prefType === "Page" && m.np !== p && (ADM.moveNode(oref, pref, "top", 0, true) || ADM.moveNode(oref, pref, "bottom", 0, true))) {
									return true;
								} else {
									return false;
								}
							} else {
								//For now content sons
								//They should not be inserted before header or after footer
								var footer = pref.getZoneArray('bottom'), header = pref.getZoneArray('top'), content = pref.getZoneArray('content');
								//footer last
								if (footer[0] && this._get_children(m.np).length === index) {
									console.warn("footer last");
									return false;
								}
								//head first
								if (header[0]) {
									if (index === 0) {
										console.warn("head first");
										return false;
									} else {
										index--;
									}
								}
								//change parent to content
								pref = pref.getZoneArray('content')[0];
								if(ADM.canAddChild(pref, oref)) {
									return true;
								}
							}
						} else {
							if (pref.getType()==="Header") {
								if (m.p==="before") {
									return false;
								}
							}
							//if the new parent = the origin parent ,we just reorder it, need not check whether can accept it
							if (p === m.np || (p[0] && m.np[0] && p[0] === m.np[0])) {
								if (prefType === "Header") {
									//In header,can not reorder
									return false;
								} else{
									return true;
								}
							}
							//Third when we move to another parent , we check the expected node can add it
							if(!ADM.canAddChild(pref, oref)) {
								return false;
							}
							return true;

						}
					}
					}
					}
					},
				"dnd" : {
						},
				"json_data" : {
						"data" : treeModel
				        },
			    "plugins" : ["themes", "json_data", "ui", "crrm", "dnd", "hotkeys"],
            });

			//catch event here
			e.bind("select_node.jstree", self._select_node);
			e.bind("move_node.jstree", function(e, data) {
					var zones = [], i = 0, flag = 0,
					    designRoot = ADM.getDesignRoot(),
					    index = data.rslt.cp,
					    oref = designRoot.findNodeByUid(data.rslt.o.find('a:first').attr("tree_uid")),
					    orefType = oref.getType(),
					    pref = designRoot.findNodeByUid(data.rslt.np.find('a:first').attr("tree_uid"));
					if (data.rslt.np[0] === $(this)[0]) {
					    //move Page
					    console.log("Move Page");
					    pref = ADM.getDesignRoot();
					} else if (orefType==="Header"||orefType==="Footer") {
					    //this for header and footer,they move between page only
					    if(ADM.moveNode(oref, pref, "top", 0) || ADM.moveNode(oref, pref, "bottom", 0)){
					        return true;
					    }
					} else if (pref.getType()==="Page") {
					    //this for content sons
					    index -= pref.getZoneArray('top').length;
					    pref = pref.getZoneArray('content')[0];
					}
					//if just reorder and position is "after" , we should get index--
					if (data.rslt.p ==="after" && (oref.getParent() === pref)){
                        --index;
					}
					//get all zones
					zones = BWidget.zonesForChild(pref.getType(), orefType);
					//Recurse to insert it
					if (zones.length > 0) {
						for (i; i < zones.length && flag !== 1; i++) {
							if (ADM.moveNode(oref, pref, zones[i], index)){
								flag = 1;
								console.log("Move successful");
							}
							index = index - BWidget.getZoneCardinality(pref.getType(), zones[i]);
						}
					}
					self.select_node(oref);
			});
			//when tree completes building , signal
			this._trigger("complete");
		},

        _getTreenode: function(admNode) {
            if (admNode instanceof ADMNode) {
				var selector = '#treenode_' + admNode.getUid(), treeNode = this.element.find(selector);
				return treeNode.length ? treeNode : this.element;
			} else {
				return -1;
			}
		},
        /**
		 * Gets the jstree instance for the special needle
		 *
		 * @param {Various} needle can be a DOM node, jQuery node or selector pointing to the tree container,
		 *                  or an element within the tree
		 * @return the jstree instance for the special needle
		 */
        _getTree: function(needle) {
            needle = needle || this.element;
            return $.jstree._reference(needle);
        },

        _select_node: function(e, data) {
            var model = ADM,
                uid = $(data.rslt.obj[0]).find('a:first').attr('tree_uid'),
                selectedNode = model.getDesignRoot().findNodeByUid(uid);
            model.setSelected(selectedNode);
            $(this).jstree("open_node",data.rslt.obj[0]);
		},

        _get_index: function(admNode) {
            var parent, treeModel, index, children, uid;
				parent = admNode.getParent();
				uid = admNode.getUid();

				if (parent.getType() === "Content") {
					parent = parent.getParent();
				}
				treeModel = this._treeModel(parent);
				children = treeModel.children;

				for (index = 0; index < children.length; index++) {
					if (children[index].uid === uid)
						break;
				}
				return index;
		},

        _node_add: function(admNode, widget, index) {
		   var treeNode = {}, children, i,
			   props = admNode.getProperties(), t,
			   parent = admNode.getParent();
			   index = index || widget._get_index(admNode);

			   treeNode.data = {};
			   treeNode.data.title = (!props.text) ? admNode.getType() : props.text;
			   treeNode.data.attr = {
				   "id" : 'treenode_' + admNode.getUid(),
				   "tree_uid" : admNode.getUid()
			   };

			   if(parent.getType() === "Content") {
				   parent = parent.getParent();
			   }
			   t = widget._getTree().create_node(widget._getTreenode(parent), index, treeNode);
			   children = admNode.getChildren();
			   if(children.length > 0) {
				   if(admNode.getType() === "Page") {
					   var header, content, footer;
					   header = admNode.getZoneArray('top');
					   content = admNode.getZoneArray('content');
					   footer = admNode.getZoneArray('bottom');
					   children = [];
					   $.merge(children, header);
					   $.merge(children, content[0].getChildren());
					   $.merge(children, footer);
				   }

				   for( i = 0; i < children.length; i++) {
					   widget._node_add(children[i], widget);
				   }
			   }
		},

		/*
		 * public functions
		 */
        open_node: function(node, callback, skip_animation) {
		    this._getTree().open_node(this._getTreenode(node), callback, skip_animation);
		},
        close_node: function(node, skip_animation) {
		    this._getTree().close_node(this._getTreenode(node), callback, skip_animation);
        },
        toggle_node: function(node) {
		    this._getTree().toggle_node(this._getTreenode(node));
		},
        open_all: function(node, do_animaltion) {
            this._getTree().open_all(this._getTreenode(node), do_animaltion);
		},
        close_all: function(node, do_animaltion) {
			this._getTree().close_all(this._getTreenode(node), do_animaltion);
		},
        select_node: function(node , check , event ) {
            this._getTree().deselect_all();
		    this._getTree().select_node(this._getTreenode(node), check, event);
	    },

		/*
		 *returns all selected nodes. if context is set - only the selected nodes within that context are returned.
         *mixed context
		 *this can be a dom node, jquery node or selector pointing to an element within the tree.
		 */
		get_selected:function( context ) {
			this._getTree().get_selected(context);
		},
		deselect_all: function( context ) {
			this._getTree().get_selected(this._getTree());
		},
		/*
		 *sets the title of a node. triggers an event.
		 *mixed node
		 *this can be a dom node, jquery node or selector pointing to the element whose title you want to change.
		 *string  text
		 *the new title.
		 */
		rename_node:function( node , text ) {
			this._getTree().rename_node(node, text);
		},
		delete_node: function( node  ) {
			this._getTree().delete_node(node);
		}
	})
})(jQuery);

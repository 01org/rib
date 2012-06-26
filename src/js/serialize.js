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

/*
 * The serialization.js contains following functions:
 *
 *   writeOut():
 *
 */
/*******************************************************
 * General functions for two directions
 ******************************************************/
var DEBUG = true,
    blockActivePageChanged = false,
    xmlserializer = new XMLSerializer(),
    formatHTML  = function (rawHTML) {
        return style_html(rawHTML, {
            'max_char': 80,
            'unformatted': ['a', 'script', 'title']
        });
    },

    /**
     * Generate HTML from ADM tree.
     *
     * @param {ADMNode} design ADM design root to be serialized.
     * @param {function(ADMNode, DOMElement)=} handler Extra handler for each node.
     *
     * @return {Object} return the generated object contains the relative html string
     */
    generateHTML = function (design, handler) {
        design = design || ADM.getDesignRoot();
        var doc = constructNewDocument($.rib.getDefaultHeaders(design));

        function renderClean(admNode, domNode) {
            $(domNode).data('uid', admNode.getUid());
            if (domNode.hasClass("rib-remove")) {
                domNode.replaceWith(domNode.text());
            }
            handler && handler(admNode, domNode);
        };

        serializeADMSubtreeToDOM(design, $(doc).find('body'), renderClean);
        return { doc: doc,
                 html: formatHTML(xmlserializer.serializeToString(doc))
        };
    },

    serializeADMNodeToDOM = function (node, domParent) {
        var uid, type, pid, selector,
            parentSelector = 'body',
            parentNode = null,
            template, props, id,
            selMap = {},  // maps selectors to attribute maps
            attrName, attrValue, propValue, propDefault,
            widget, regEx, wrapper, domNodes;

        // Check for valid node
        if (node === null || node === undefined ||
            !(node instanceof ADMNode)) {
            return null;
        }

        template = BWidget.getTemplate(node.getType());

        // 1. Regenerating the entire Design, re-create entire document
        if (node.instanceOf('Design')) {
            return null;
        }

        uid = node.getUid();
        type = node.getType();
        selector = '.adm-node[data-uid=\'' + uid + '\']';
        selector += ',.orig-adm-node[data-uid=\'' + uid + '\']';

        if (!node.instanceOf('Page') && !node.instanceOf('Design')) {
            pid = node.getParent().getUid();
            parentSelector = '.adm-node[data-uid="' + pid +
                '"]:not(.delegation),.orig-adm-node[data-uid=\'' + pid + '\']';
        }

        // Find the parent element in the DOM tree
        if (domParent) {
            parentNode = $(domParent);
        } else {
            parentNode = $(':rib-layoutView')
                .layoutView('option','contentDocument').find(parentSelector)
                .last();
        }

        // Find the parent element of this node in the DOM tree
        if (parentNode === undefined || parentNode === null ||
            parentNode.length < 1) {
            // No sense adding it to the DOM if we can't find it's parent
            console.info(parentSelector+' not found in Design View');
        }

        domNodes = $(selector, parentNode);
        // Ensure we have at least something to use as HTML for this item
        if (template === undefined || template === '') {
            console.warn('Missing template for ADMNode type: '+type+
                            '.  Trying defaults...');
            template = defaultTemplates[type];
            // If no default exists, we must error out
            if (template === undefined || template === '') {
                console.error('No template exists for ADMNode type: '+type);
                return null;
            }
        }

        props = node.getProperties();

        if (typeof template === "function") {
            template =  $('<div/>').append(template(node)).html();
        }

        // Apply any special ADMNode properties to the template before we
        // create the DOM Element instance
        for (var p in props) {
            propValue = attrValue = node.getProperty(p);

            switch (p) {
            case "type":
                break;
            default:
                attrName = BWidget.getPropertyHTMLAttribute(type, p);
                if (typeof attrName  === "object") {
                    var attrMap = attrName;
                    attrName = attrMap.name;
                    attrValue = attrMap.value[propValue];
                }
                if (attrName) {
                    propDefault = BWidget.getPropertyDefault(type, p);

                    if (propValue !== propDefault ||
                        BWidget.getPropertyForceAttribute(type, p)) {
                        selector = BWidget.getPropertyHTMLSelector(type, p);
                        if (!selector) {
                            // by default apply attributes to first element
                            selector = ":first";
                        }

                        if (!selMap[selector]) {
                            // create a new select map entry
                            selMap[selector] = {};
                        }

                        // add attribute mapping to corresponding selector
                        selMap[selector][attrName] = attrValue;
                    }
                }
                break;
            }

            if (typeof propValue === "string" ||
                typeof propValue === "number") {
                // reasonable value to substitute in template
                regEx = new RegExp('%' + p.toUpperCase() + '%', 'g');
                if(typeof propValue === "string") {
                    propValue = propValue.replace(/&/g, "&amp;");
                    propValue = propValue.replace(/"/g, "&quot;");
                    propValue = propValue.replace(/'/g, "&#39;");
                    propValue = propValue.replace(/</g, "&lt;");
                    propValue = propValue.replace(/>/g, "&gt;");
                    // Append UID to assist with debugging
                    if ($.rib.debug('showuid') && p === 'text') {
                        propValue += ' '+uid;
                    }
                }
                template = template.replace(regEx, propValue);
            }
        }

        // Turn the template into an element instance, via jQuery
        widget = $(template);

        // apply the HTML attributes
        wrapper = $("<div>").append(widget);
        for (selector in selMap) {
            wrapper.find(selector)
                .attr(selMap[selector]);
        }

        if (domNodes.length === 0) {
            var zone = BWidget.getZone(node.getParent().getType(), node.getZone());
            if (zone.itemWrapper)
                widget = $(zone.itemWrapper).append(widget);
            if (zone.locator)
                $(parentNode).find(zone.locator).append(widget);
            else
                $(parentNode).append(widget);
        }
        else {
            //The template of some widgets may have multiple root tags
            //and there are also possible delegated nodes, we will remove all
            //the extra nodes before replacing the last one.
            //It's also possible that jQM generates nodes which are not
            //delegating, we should also have a mechanism to handle this case,
            //but till now we don't have such case, so we can defer this case
            //to be handled in the delegate function of the corresponding widget
            //e.g. To add a special class to these tags so that they can be selected
            //to remove here.
            for (var i = 1; i < domNodes.length; i ++)
                $(domNodes[i]).remove();
            $(domNodes[0]).replaceWith(widget);
        }

        return widget;
    },

    serializeADMSubtreeToDOM = function (node, domParent, renderer) {
        var isContainer = false,
            domElement;

        // 1. Only handle ADMNodes
        if (!(node instanceof ADMNode)) {
            return;
        }

        isContainer = (node.getChildrenCount() !== 0);

        // 2. Do something with this node
        domElement = serializeADMNodeToDOM(node, domParent);
        if (renderer && domElement) {
            renderer(node, domElement);
        }

        domElement = domElement || domParent;

        // 3. Recurse over any children
        if (isContainer) {
            var children = node.getChildren();
            for (var i=0; i<children.length; i++) {
                serializeADMSubtreeToDOM(children[i], domElement, renderer);
            }
        }

        // 4. Return (anything?)
        return;
    };
function constructNewDocument(headers) {
    var doc = document.implementation.createHTMLDocument('title'),
        head = $(doc.head),
        tmpHead = '', i;

    if (headers && headers.length > 0) {
        for (i=0; i < headers.length; i++) {
            if (headers[i].match('<script ')) {
                // Need this workaround since appendTo() causes the script
                // to get parsed and then removed from the DOM tree, meaning
                // it will not be in any subsequent Serialization output later
                tmpHead = head[0].innerHTML;
                head[0].innerHTML = tmpHead+headers[i];
            } else {
                $(headers[i]).appendTo(head);
            }
        }
    }

    return doc;
}

function dumplog(loginfo){
    if (DEBUG && (typeof loginfo === "string")){
        console.log(loginfo);
    }
    return;
}


$(function() {

    /*******************************************************
     * JSON to ADM Direction
     ******************************************************/
    /**
     * Loads a design from a JSON object and replaces the design root. Sets the
     * AMD design root to this design, which sends a designReset event.
     *
     * @param {Object} obj The JSON object to parse
     * @param {function(ADMNode, Object)=} eachHandler Extra handler for each pair of
     *                                                 ADM node and the related object.
     *
     * @return {ADMNode/null} the design build from the text if success, null if failed.
     */
    function JSONToProj(text, eachHandler) {
        var result, design, parsedObject, resultProject = {}, add_child;

        add_child = function (node, srcObject) {
            var children, child, zone,
                properties, childNode,
                item, val, result, i;

            if ((typeof srcObject !== "object") || !(node instanceof ADMNode)) {
                return false;
            }
            properties = srcObject.properties;
            try {
                // Set properties for current node
                for (item in properties) {
                    // parser the properties and set the value to the node
                    val = properties[item];
                    // if we can't get value, we set item's value as default
                    if (!val){
                        val = node.getPropertyDefault(item);
                    }

                    // NOTE: It's important that we pass "true" for the fourth
                    // parameter here (raw) to disable "property hook"
                    // functions like the grid one that adds or removes child
                    // Block elements based on the property change
                    node.setProperty(item, val, null, true);
                }
                // Scan children nodes
                children = srcObject.children;
                for (i = 0; i < children.length; i++) {
                    child = children[i];
                    childNode = ADM.createNode(child.type, true);

                    // add child node to current node
                    if (!node.addChildToZone(childNode, child.zone)) {
                        dumplog("add child type "+ child.type + " failed");
                        return false;
                    }
                    result = add_child(childNode, child);
                    if (!result) {
                        return false;
                    }
                }
            }catch (e) {
                if (!confirm("Error when " + (i ? " adding new child '" +
                             child.type + "'" : "setting property '" +
                             item + "'") + " - " + e +
                            ".\n\nContinue loading the design?"))
                    return false;
            }
            // call extra handler for each relative pair
            eachHandler && eachHandler(node, srcObject);
            return true;
        };
        /************************ add_child function end *************************/

        try {
            parsedObject = $.parseJSON(text);
        } catch(e) {
            parsedObject = null;
            alert("Invalid design file.");
        }
        if (parsedObject === null || parsedObject.type !== "Design") {
            console.log("obj is null or is not a 'Design' Node");
            return null;
        }

        design = new ADMNode("Design");
        design.suppressEvents(true);

        // add children in ADM
        try {
            result = add_child(design, parsedObject);
        } catch(e) {
            result = null;
            alert("Invalid design file.");
        }

        design.suppressEvents(false);

        if (result) {
            resultProject.design = design;
            resultProject.pInfo = parsedObject.pInfo;
            return resultProject;
        } else {
            console.error("Error while building design root from JSON");
            return null;
        }
    }

    /*
     * This function is to find valid design.json in imported file and build ADMTree according it
     */
    function zipToProj(pid, data) {
        var zip, designData, successHandler, errorCreateDir, projectDir;
        projectDir = $.rib.pmUtils.ProjectDir + "/" + pid + "/";
        try {
            zip = new ZipFile(data);
            zip.filelist.forEach(function(zipInfo, idx, array) {
                // if find a file name contians "json" then get its data
                if (zipInfo.filename.indexOf("json") !== -1) {
                    designData = zip.extract(zipInfo.filename);
                }
                // if the file is custom image located in "images/" folder,
                // then copy them to sandbox
                if (zipInfo.filename.indexOf("images/") === 0) {
                    successHandler = function (dirEntry) {
                        if (!dirEntry.isDirectory) {
                            console.error(dirEntry.fullPath + " is not a directory in sandbox.");
                            return;
                        }
                        // Write uploaded file to sandbox
                        $.rib.fsUtils.write(projectDir + zipInfo.filename, zip.extract(zipInfo.filename), null, null, false, true);
                    };
                    $.rib.fsUtils.pathToEntry(projectDir + "images", successHandler, function (e) {
                        // if "images/" folder don't exist, then create it.
                        if (e.code === FileError.NOT_FOUND_ERR) {
                            // Create a Untitled project and open it in onEnd function
                            $.rib.fsUtils.mkdir(projectDir + "images", successHandler);
                        } else {
                            $.rib.fsUtils.onError(e);
                        }
                    });
                }
            });
        } catch (e) {
            designData = data;
        }
        return designData;
    }

    /*******************************************************
     * ADM to JSON Direction
     ******************************************************/
    /**
     * Serialize ADMTree to an common javascript Object.
     *
     * @param {ADMNode} ADMTreeNode ADM node to be serialized.
     * @param {function(ADMNode, Object)=} handler Extra handler for each pair of
     *                                             ADM node and the related object.
     * @return {Bool} return the serialized Object if success, null when fails
     */
    function ADMToJSONObj(ADMTreeNode, handler) {
        ADMTreeNode = ADMTreeNode || ADM.getDesignRoot();
        if (ADMTreeNode instanceof ADMNode) {
            // Save staff in ADMNode
            var JSObject = {},
                children, i;
            JSObject.type = ADMTreeNode.getType();
            JSObject.zone = ADMTreeNode.getZone();
            JSObject.properties = ADMTreeNode.getProperties();
            JSObject.children = [];

            // Recurse to fill children array
            children = ADMTreeNode.getChildren();
            if (children.length > 0) {
                for (i = 0; i < children.length; i++) {
                    JSObject.children[i] = ADMToJSONObj(children[i], handler);
                }
            }
            // run handler to handle every node
            handler && handler(ADMTreeNode, JSObject);
            return JSObject;
        } else {
            console.log("warning: children of ADMNode must be ADMNode");
            return null;
        }
    }

    function getDefaultHeaders(design) {
        var i, props, el, designRoot;
        designRoot = design || ADM.getDesignRoot();
        var i, props, el;

        $.rib.defaultHeaders = $.rib.defaultHeaders || [];

        if ($.rib.defaultHeaders.length > 0)
            return $.rib.defaultHeaders;

        props = designRoot.getProperty('metas');
        for (i in props) {
            // Skip design only header properties
            if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
                continue;
            }
            el = '<meta ';
            if (props[i].hasOwnProperty('key')) {
                el = el + props[i].key;
            }
            if (props[i].hasOwnProperty('value')) {
                el = el + '="' + props[i].value + '"';
            }
            if (props[i].hasOwnProperty('content')) {
                el = el + ' content="' + props[i].content + '"';
            }
            el = el + '>';
            $.rib.defaultHeaders.push(el);
        }
        props = designRoot.getProperty('libs');
        for (i in props) {
            // Skip design only header properties
            if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
                continue;
            }
            el = '<script ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'src="' + props[i].value + '"';
            }
            el = el + '></script>';
            $.rib.defaultHeaders.push(el);
        }
        props = designRoot.getProperty('css');
        for (i in props) {
            // Skip design only header properties
            if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
                continue;
            }
            el = '<link ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'href="' + props[i].value + '"';
            }
            el = el + ' rel="stylesheet">';
            $.rib.defaultHeaders.push(el);
        }
        return $.rib.defaultHeaders;
    }

    function getDesignHeaders() {
        var i, props, el;

        $.rib.designHeaders = $.rib.designHeaders || [];
        if ($.rib.designHeaders.length > 0)
            return $.rib.designHeaders;

        props = ADM.getDesignRoot().getProperty('metas');
        for (i in props) {
            el = '<meta ';
            if (props[i].hasOwnProperty('key')) {
                el = el + props[i].key;
            }
            if (props[i].hasOwnProperty('value')) {
                el = el + '="' + props[i].value + '"';
            }
            if (props[i].hasOwnProperty('content')) {
                el = el + ' content="' + props[i].content + '"';
            }
            el = el + '>';
            $.rib.designHeaders.push(el);
        }
        props = ADM.getDesignRoot().getProperty('libs');
        for (i in props) {
            el = '<script ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'src="' + props[i].value + '"';
            }
            el = el + '></script>';
            $.rib.designHeaders.push(el);
        }
        props = ADM.getDesignRoot().getProperty('css');
        for (i in props) {
            el = '<link ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'href="' + props[i].value + '"';
            }
            el = el + ' rel="stylesheet">';
            $.rib.designHeaders.push(el);
        }
        return $.rib.designHeaders;
    }

   function  exportFile (fileName, content, binary) {
        var cookieValue = $.rib.cookieUtils.get("exportNotice"),
            $exportNoticeDialog = createExportNoticeDialog(),
            saveAndExportFile = function () {
                $.rib.fsUtils.write(fileName, content, function(fileEntry){
                    $.rib.fsUtils.exportToTarget(fileEntry.fullPath);
                }, null, false, binary);
            };

        if(cookieValue === "true" && $exportNoticeDialog.length > 0) {
            // bind exporting HTML code handler to OK button
            $exportNoticeDialog.dialog("option", "buttons", {
                "OK": function () {
                    saveAndExportFile();
                    $("#exportNoticeDialog").dialog("close");
                }
            });
            // open the dialog
            $exportNoticeDialog.dialog("open");
        } else {
            // if cookieValue is not true, export HTML code directly
            saveAndExportFile();
        }
    }

    // create a notice Dialog for user to configure the browser, so that
    // a native dialog can be shown when exporting design or HTML code
    function  createExportNoticeDialog () {
        var dialogStr, dialogOpts, $exportNoticeDialog, cookieExpires;
        cookieExpires = new Date("January 1, 2042");
        dialogStr = '<div id="exportNoticeDialog">';
        dialogStr += 'Note: Files will be saved in the default download path of the Browser.';
        dialogStr += '<p>To configure the Browser to ask you to where to save files, go to:<br>';
        dialogStr += 'Preferences -> Under the Hood -> Download</p>';
        dialogStr += '<p>Then check the box "Ask where to save each file before downloading"</p>';
        dialogStr += '<p><input type="checkbox">Do not remind me again</p>';
        dialogStr += '</div>';
        dialogOpts = {
            autoOpen: false,
            modal: true,
            width: 500,
            resizable: false,
            height: 400,
            title: "RIB",
        };
        $(dialogStr).dialog(dialogOpts);
        $exportNoticeDialog = $("#exportNoticeDialog");
        if($exportNoticeDialog.length <= 0) {
            console.error("create saveAlertDialog failed.");
            return null;
        }
        $exportNoticeDialog.find("input:checkbox").click(function () {
            var notice = this.checked ? "false" : "true";
            // set cookie
            if(!$.rib.cookieUtils.set("exportNotice", notice, cookieExpires)) {
                console.error("Set exportNotice cookie failed.");
            }
        });
        return $exportNoticeDialog;
    }

    function addInternalFiles(zip) {
        var imageDir;
        imageDir = $.rib.pmUtils.ProjectDir + "/" + $.rib.pmUtils.getActive() + "/images/";
        $.rib.fsUtils.ls(imageDir, function (entries) {
            $.each(entries, function(index, fileEntry) {
                fileEntry.file(function(file) {
                    var reader = new FileReader();

                    reader.onloadend = function(e) {
                        zip.add("images/" + fileEntry.name, e.target.result, {binary:true});
                    };
                    reader.readAsBinaryString(file);
                });
            });
        });
    }

    function exportPackage (resultProject) {
        var zip, resultHTML, files, i;
        zip = new JSZip();
        resultHTML = generateHTML(null, function (admNode, domNode) {
            var props, p, value, pType, rootUrl, projectDir;
            // change sandbox URL for index.html
            rootUrl = $.rib.fsUtils.fs.root.toURL();
            projectDir = rootUrl.replace(/\/$/, "") + $.rib.pmUtils.ProjectDir + "/" + $.rib.pmUtils.getActive() + "/";
            props = admNode.getProperties();
            for (p in props) {
                value = props[p];
                pType = BWidget.getPropertyType(admNode.getType(), p);
                if (pType === "url-upload") {
                    // Just delete the project folder sandbox URL
                    value = value.replace(projectDir, "");
                    // TODO: need to handle other directory in sandbox
                    // change the attribute for serialized DOM element 
                    domNode.attr(p, value);
                }
            }
        });
        resultHTML && zip.add("index.html", resultHTML.html);
        resultProject && zip.add("project.json", resultProject);
        addInternalFiles(zip);
        files = [
            'src/css/images/ajax-loader.png',
            'src/css/images/icons-18-white.png',
            'src/css/images/icons-36-white.png',
            'src/css/images/icons-18-black.png',
            'src/css/images/icons-36-black.png',
            'src/css/images/icon-search-black.png',
            'src/css/images/web-ui-fw_noContent.png',
            'src/css/images/web-ui-fw_volume_icon.png',
            'src/css/images/widgets/tizen_image.svg'
        ];
        function getDefaultHeaderFiles (type) {
            var headers, files = [];
            headers = ADM.getDesignRoot().getProperty(type);
            for ( var header in headers) {
                // Skip design only header properties
                if (headers[header].hasOwnProperty('designOnly') && headers[header].designOnly) {
                    continue;
                }
                files.push(headers[header].value);
            }
            return files;
        }
        $.merge(files, $.merge(getDefaultHeaderFiles("libs"), getDefaultHeaderFiles("css")));

        i = 0;
        function getFile () {
            if (i < files.length)
            {
                // We have to do ajax request not using jquery as we can't get "arraybuffer" response from jquery
                var req = window.ActiveXObject ? new window.ActiveXObject( "Microsoft.XMLHTTP" ): new XMLHttpRequest();
                req.onload = function() {
                    var uIntArray = new Uint8Array(this.response);
                    var charArray = new Array(uIntArray.length);
                    for (var j = 0; j < uIntArray.length; j ++)
                        charArray[j] = String.fromCharCode(uIntArray[j]);
                    zip.add(files[i],btoa(charArray.join('')), {base64:true});
                    if (i === files.length - 1){
                        var content = zip.generate(true);
                        exportFile("design.zip", content, true);
                    }
                    i++;
                    getFile();
                }
                try
                {
                    req.open("GET", files[i], true);
                    req.responseType = 'arraybuffer';
                } catch (e) {
                    alert(e);
                }
                req.send(null);
            }
        }
        getFile();
    }

/***************** export functions out *********************/

    /**
     * Acceptable uploaded file types
     *
     * Each type object contains:
     *     mime {String} Recommended mimeType of related input element
     *     suffix {Array} Array of acceptable suffix of uploaded file
     */
    $.rib.fileTypes = {
        js: {
            mime: 'text/javascript',
            suffix: ['js'],
        },
        image: {
            mime: 'image/*',
            suffix: ['jpg', 'png', 'svg', 'bmp',
                'gif', 'jpeg', 'jpm', 'jp2', 'jpx',
                'xml', 'cgm', 'ief'],
        },
        css: {
            mime: 'text/css',
            suffix: ['css'],
            savePath: '{project}/css/'
        },
        any: {
            mime: '*',
            suffix: ['*'],
        }
    };

    /**
     * Check if the uploaded file is acceptable, currently just check suffix
     *
     * @param {String} type File type to check
     * @param {File} file Uploaded file object which is an instance of 'File'
     *
     * @return {Bool} Return true if the file is acceptable, otherwise return false
     */
    $.rib.checkFileType = function (type, file) {
        var arrString, rule;
        arrString = $.rib.fileTypes[type.toLowerCase()].suffix.join('|');
        rule = new RegExp("\\.(" + arrString + ")$", "i");
        // TODO: May need to read the "content-type" to check the type
        return rule.test(file.name);
    };

    /**
     * Trigger an native dialog to upload file in a container
     *
     * @param {String} type File type to upload
     * @param {Jquery Object} container DOM element where native dialog will be triggered
     * @param {function(File)=} success Success callback with uploaded file as its parameter
     * @param {function()=} error Error callback
     *
     * @return {None}
     */
    $.rib.upload = function (fileType, container, success, error) {
        var input, mimeType;
        container = container || $('body');
        mimeType = $.rib.fileTypes[fileType.toLowerCase()].mime;
        input = $('<input type="file" accept="' + mimeType +'"/>')
                .addClass('hidden-accessible').appendTo(container);
        input.change(function (e) {
            var file;
            if (e.currentTarget.files.length === 1) {
                file = e.currentTarget.files[0];
                if ($.rib.checkFileType(fileType, file)) {
                    success && success(file)
                } else {
                    console.warn("Unexpected uploaded file.");
                    // TODO: confirm with user if still use the file
                    error && error();
                }
            } else {
                if (e.currentTarget.files.length <= 1) {
                    console.warn("No files specified to import");
                } else {
                    console.warn("Multiple file import not supported");
                }
                error && error();
            }
            // remove the temp input element
            input.remove();
        });
        input.click();
    };

    /**
     * Trigger an native dialog to upload file in a container,
     * and save the file in a parent directory. If the parent directy is not exist,
     * it will be create, but it only work
     *
     * @param {String} type File type to upload
     * @param {String} parentDir Directory where the uploaded file to be saved in
     * @param {Jquery Object} container DOM element where native dialog will be triggered
     * @param {function(File)=} success Success callback with uploaded file as its parameter
     * @param {function()=} error Error callback
     *
     * @return {None}
     */
    $.rib.uploadAndSave = function (fileType, parentDir, container, success, error) {
        var handler = function (file) {
            var successHandler, errorCreateDir;
            successHandler = function (dirEntry) {
                if (!dirEntry.isDirectory) {
                    console.error(dirEntry.fullPath + " is not a directory in sandbox.");
                    return;
                }
                // Write uploaded file to sandbox
                $.rib.fsUtils.write(parentDir + file.name, file, function(newFile){
                    success && success(newFile);
                });
            };
            errorCreateDir = function (e) {
                if (e.code === FileError.NOT_FOUND_ERR) {
                    // Create a Untitled project and open it in onEnd function
                    $.rib.fsUtils.mkdir(parentDir, successHandler);
                } else {
                    $.rib.fsUtils.onError(e);
                    error && error();
                }
            };
            $.rib.fsUtils.pathToEntry(parentDir, successHandler, errorCreateDir);
        };

        $.rib.upload(fileType, container, handler, error)
    }

    $.rib.inSandbox = function (url) {
        var rootUrl = $.rib.fsUtils.fs.root.toURL();
        if (url && url.indexOf(rootUrl) === 0) {
            return true;
        } else {
            return false;
        }
    };
    // Export serialization functions into $.rib namespace
    $.rib.ADMToJSONObj = ADMToJSONObj;
    $.rib.JSONToProj = JSONToProj;
    $.rib.zipToProj = zipToProj;

    $.rib.getDefaultHeaders = getDefaultHeaders;
    $.rib.getDesignHeaders = getDesignHeaders;

    $.rib.exportPackage = exportPackage;
});

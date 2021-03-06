var path = require('path'),
    version = require(path.resolve(__dirname, '../package.json')).version;

module.exports.init = function() {
    'use strict';

    var fs = require('fs-extra'),
        program = require('commander'),
        sha1 = require('sha1'),
        walk = require('walkdir'),

        FILE_TYPE = require(path.resolve(__dirname, '../assets/file-type.js')),

        changeHandlerOnClick = (new (require('./change-handler-to-on-click.js').ChangeHandlerOnClick)()),
        handleDeprecatedModules = (new (require('./handle-deprecated-modules.js').HandleDeprecatedModules)()),
        removeAUICSSPrefix = (new (require('./remove-aui-css-prefix.js').RemoveAUICSSPrefix)()),
        renameCSSClasses = (new (require('./rename-css-classes.js').RenameCSSClasses)()),
        replaceAUIDialog = (new (require('./replace-aui-dialog.js').ReplaceAUIDialog)()),
        replaceInputCSSClass = (new (require('./replace-input-css-class.js').ReplaceInputCSSClass)()),
        replaceSelectorButton = (new (require('./replace-selector-button.js').ReplaceSelectorButton)()),
        addNamespaceInput = (new (require('./add-namespace-input.js').AddNamespaceInput)()),

        PROCESSORS = {
            css: [
                removeAUICSSPrefix,
                renameCSSClasses
            ],

            js: [
                removeAUICSSPrefix,
                handleDeprecatedModules,
                renameCSSClasses,
                replaceSelectorButton,
                changeHandlerOnClick,
                replaceAUIDialog
            ],

            jsp: [
                removeAUICSSPrefix,
                handleDeprecatedModules,
                renameCSSClasses,
                replaceSelectorButton,
                replaceInputCSSClass,
                changeHandlerOnClick,
                replaceAUIDialog,
                addNamespaceInput
            ]
        };

    /*
     * All processors for JSP pages will handle JSP pages too
     * See #7
     */

    PROCESSORS.jspf = PROCESSORS.jsp;

    function list(value) {
        return value.split(',').map(String);
    }

    program
        .option('-f, --file [file name]', 'The file(s) to process.', list)
        .option('-e, --ext [file extensions]', 'The file extensions which should be processed. Defaults to "js, jsp, jspf, css".', function(value) {
            value = value.split(',');

            return value.map(
                function(item) {
                    return item.trim();
                }
            );
        }, ['js', 'jsp', 'jspf', 'css'])
        .version(version)
        .parse(process.argv);

    if (!program.file) {
        console.log('No files or folder!');

        process.exit();
    }

    function getContext(extension) {
        extension = extension.toLowerCase();

        if (extension === 'css') {
            return FILE_TYPE.CSS;
        }
        else if (extension === 'js') {
            return FILE_TYPE.CSS;
        }
        else if (extension === 'jsp') {
            return FILE_TYPE.JSP;
        }
        else if (extension === 'jspf') {
            return FILE_TYPE.JSPF;
        }
        else {
            return FILE_TYPE.UNKNOWN;
        }
    }

    function processFile(fileName, extension) {
        var context,
            processors;

        context = getContext(extension);
        processors = PROCESSORS[extension];

        if (processors) {
            fs.readFile(
                fileName,
                function(err, content) {
                    var orignalContent;

                    if (err) {
                        console.log('Cannot read file: ' + fileName + '.\n' + err);

                        return;
                    }

                    content = orignalContent = content.toString();

                    processors.forEach(
                        function(processor) {
                            content = processor.process(content, context);
                        }
                    );

                    if (sha1(orignalContent) !== sha1(content)) {
                        fs.writeFile(fileName, content, function(error) {
                            if (error) {
                                console.log(error);
                            }
                            else {
                                console.log('Save: ' + fileName);
                            }
                        });
                    }

                }
            );
        }
    }

    // export PROCESSORS
    module.exports.PROCESSORS = PROCESSORS;

    // Process passed files/directories
    if (program.file) {
        program.file.forEach(
            function(file) {
                var emitter = walk(file);

                emitter.on('file', function(filename, stat) {
                    var fileExt = path.extname(filename).substring(1).toLowerCase();

                    if (program.ext.indexOf(fileExt) >= 0) {
                        console.log('Processing: ' + filename);

                        processFile(filename, fileExt);
                    }
                });
            }
        );
    }
};

module.exports.version = version;
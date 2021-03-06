(function () {

    var applyToShareJS;
    //var preActionCodemirrorContent;
    applyToShareJS = function (editorDoc, delta, doc) {
        var pos, text, end_pos, action, change;
        change = delta;
        var preActionCodemirrorContent = doc.getText();
        while (1) {
            pos = myIndexFromPos(change.from.line, change.from.ch, preActionCodemirrorContent);
            //if (change.from.line - change.to.line == 0 && change.to.ch > change.text.length)
            //    change.to.ch = change.text.length;
            end_pos = myIndexFromPos(change.to.line, change.to.ch, preActionCodemirrorContent);
            action = '';
            if (change.text[0] == "" && change.text.length == 1) {
                if (change.from.line != change.to.line)
                    action = 'removeLines';
                else
                    action = 'removeText';
            }
            else {
                if (change.text.length > 1)
                    action = 'insertLines';
                else
                    action = 'insertText';
            }
            switch (action) {
                case 'insertText':
                    if (pos != end_pos && pos != 0)
                        doc.del(pos, end_pos - pos);
                    doc.insert(pos, change.text[0]);
                    break;
                case 'removeText':
                    doc.del(pos, end_pos - pos);
                    break;
                case 'insertLines':
                    if (pos != end_pos)
                        doc.del(pos, end_pos - pos);
                    text = change.text.join('\n');
                    doc.insert(pos, text);
                    break;
                case 'removeLines':
                    doc.del(pos, end_pos - pos);
                    break;
                default:
                    throw new Error("unknown action: " + delta.action);
            }

            //preActionCodemirrorContent = doc.getText();
            if (!change.next)
                break;
            change = change.next;
        }
    };

    window.sharejs.Doc.prototype.attach_codemirror = function (editor, keepEditorContents) {
        var check, doc, editorDoc, editorListener, suppress;
        if (!this.provides['text']) {
            throw new Error('Only text documents can be attached to CodeMirror');
        }
        doc = this;
        editorDoc = editor;

        check = function () {
            return window.setTimeout(function () {
                var editorText, otText;
                editorText = editorDoc.getValue();
                otText = doc.getText();
                if (editorText !== otText) {
                    console.error("Texts are out of sync. Most likely this is caused by a bug in this code.");
                    editorDoc.setOption("onChange", null);
                    editorDoc.setValue(otText);
                    editorDoc.setOption("onChange", editorListener);
                }
            }, 0);
        };
        if (keepEditorContents && doc.getText().length == 0) {
            doc.del(0, doc.getText().length);
            doc.insert(0, editorDoc.getValue());
        } else {
            editorDoc.setValue(doc.getText());
        }
        //preActionCodemirrorContent = editorDoc.getValue();
        check();
        suppress = false;
        editorListener = function (change, tc) {
            if (suppress) return;
            applyToShareJS(editorDoc, tc, doc);
            return check();
        };
        editorDoc.on("change", editorListener);
        myIndexFromPos = function (line, ch, value) {
            var myIndex = 0;
            var count = 0;
            var lines = value.split("\n");
            for (var i = 0; i < lines.length; i++) {
                if (count < line)
                    myIndex += lines[i].length + 1
                else {
                    myIndex += ch;
                    break;
                }
                count++;
            }
            return myIndex;
        };
        doc.on('insert', function (pos, text) {
            suppress = true;
            var start = editorDoc.posFromIndex(pos);
            editorDoc.replaceRange(text, start);
            suppress = false;
            //preActionCodemirrorContent = editorDoc.getValue();
            return check();
        });
        doc.on('delete', function (pos, text) {
            var range;
            suppress = true;
            start = editorDoc.posFromIndex(pos);
            end = editorDoc.posFromIndex(pos + text.length);
            editorDoc.replaceRange("", start, end);
            suppress = false;
            //preActionCodemirrorContent = editorDoc.getValue();
            return check();
        });
        doc.detach_codemirror = function () {
            editorDoc.removeListener('change', editorListener);
            return delete doc.detach_codemirror;
        };
    };

}).call(this);
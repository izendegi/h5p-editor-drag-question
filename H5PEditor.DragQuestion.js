var H5PEditor = H5PEditor || {};

/**
 * Interactive Video editor widget module
 *
 * @param {jQuery} $
 */
H5PEditor.widgets.dragQuestion = H5PEditor.DragQuestion = (function ($) {
  /**
   * Helps create new H5P instances. (Probably belongs in core or something...)
   *
   * @param {type} library
   * @returns {@exp;H5P@pro;classFromName@call;@call;}
   */
  function I(library) {
    return new (H5P.classFromName(library.library.split(' ')[0]))(library.params, H5P.getContentPath(H5PEditor.contentId));
  }

  /**
   * Initialize interactive video editor.
   *
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
   * @returns {_L8.C}
   */
  function C(parent, field, params, setValue) {
    var that = this;

    // Set params
    if (params === undefined) {
      this.params = {
        elements: [],
        dropZones: []
      };
      setValue(field, this.params);
    }
    else {
      this.params = params;
    }

    // Get updates for fields
    H5PEditor.followField(parent, 'background', function (params) {
      that.setBackground(params);
    });
    H5PEditor.followField(parent, 'size', function (params) {
      that.setSize(params);
    });

    this.parent = parent;
    this.field = field;

    this.passReadies = true;
    parent.ready(function () {
      that.passReadies = false;
    });
  };

  /**
   * Append field to wrapper.
   *
   * @param {type} $wrapper
   * @returns {undefined}
   */
  C.prototype.appendTo = function ($wrapper) {
    var that = this;

    this.$item = $(this.createHtml()).appendTo($wrapper);
    this.$editor = this.$item.children('.h5peditor-dragquestion');
    this.$dnbWrapper = this.$item.children('.h5peditor-dragnbar');
    this.$dialog = this.$item.children('.h5peditor-fluid-dialog');
    this.$dialogInner = this.$dialog.children('.h5peditor-fd-inner');
    this.$errors = this.$item.children('.errors');

    this.$dialog.find('.h5peditor-done').click(function () {
      if (that.doneCallback() !== false) {
        that.hideDialog();
      }
      return false;
    }).end().find('.h5peditor-remove').click(function () {
      that.removeCallback();
      that.hideDialog();
      return false;
    });

    this.fontSize = parseInt(this.$editor.css('fontSize'));
  };

  /**
   * Create HTML for the field.
   *
   * @returns {@exp;H5PEditor@call;createItem}
   */
  C.prototype.createHtml = function () {
    return H5PEditor.createItem(this.field.widget, '<span class="h5peditor-label">' + this.field.label + '</span><div class="h5peditor-dragnbar"></div><div class="h5peditor-dragquestion">Please specify task size first.</div><div class="h5peditor-fluid-dialog"><div class="h5peditor-fd-inner"></div><div class="h5peditor-fd-buttons"><a href="#" class="h5peditor-fd-button h5peditor-done">' + C.t('done') + '</a><a href="#" class="h5peditor-fd-button h5peditor-remove">' + C.t('remove') + '</a></div></div>');
  };

  /**
   * Set current background.
   *
   * @param {Object} params
   * @returns {undefined}
   */
  C.prototype.setBackground = function (params) {
    var path = params === undefined ? '' : params.path;
    if (path !== '') {
      path = H5PEditor.filesPath + (params.tmp !== undefined && params.tmp ? '/h5peditor/' : '/h5p/content/' + H5PEditor.contentId + '/') + path;
    }

    this.$editor.css({
      backgroundImage: 'url(' + path + ')'
    });
  };

  /**
   * Set current dimensions.
   *
   * @param {Object} params
   * @returns {undefined}
   */
  C.prototype.setSize = function (params) {
    if (params === undefined) {
      return;
    }

    var width = this.$editor.width();
    this.$editor.css({
      height: width * (params.height / params.width),
      fontSize: this.fontSize * (width / params.width)
    });

    // TODO: Should we care about resize events? Will only be an issue for responsive designs.

    if (this.dnb === undefined) {
      this.initializeEditor();
    }

    // TODO: Move elements that is outside inside.
  };

  /**
   * Initialize DragNBar and add elements.
   *
   * @returns {undefined}
   */
  C.prototype.initializeEditor = function () {
    var that = this;
    this.$editor.html('').addClass('h5p-ready');

    this.dnb = new H5P.DragNBar(this.getButtons(), this.$editor);

    this.dnb.stopMovingCallback = function (x, y) {
      // Update params when the element is dropped.
      var id = that.dnb.dnd.$element.data('id');
      var params = that.dnb.dnd.$element.hasClass('h5p-dq-dz') ? that.params.dropZones[id] : that.params.elements[id];
      params.x = x;
      params.y = y;
    };

    this.dnb.dnd.releaseCallback = function () {
      // Edit element when it is dropped.
      if (that.dnb.newElement) {
        setTimeout(function () {
          that.dnb.dnd.$element.dblclick();
        }, 1);
      }
    };
    this.dnb.attach(this.$dnbWrapper);

    // Add Elements
    this.elements = [];
    for (var i = 0; i < this.params.elements.length; i++) {
      this.insertElement(i);
    }

    // Add Drop Zones
    this.dropZones = [];
    for (var i = 0; i < this.params.dropZones.length; i++) {
      this.insertDropZone(i);
    }
  };

  /**
   *
   * @param {type} semantics
   * @param {type} params
   * @returns {_L8.C.prototype.generateElementForm.Anonym$2}
   */
  C.prototype.generateForm = function (semantics, params) {
    var $form = $('<div></div>');
    H5PEditor.processSemanticsChunk(semantics, params, $form, this);
    var $lib = $form.children('.library:first');
    if ($lib.length !== 0) {
      $lib.children('label, select').hide().end().children('.libwrap').css('margin-top', '0');
    }

    return {
      $form: $form,
      children: this.children
    };
  };

  /**
   * Generate a list of buttons for DnB.
   *
   * @returns {Array} Buttons
   */
  C.prototype.getButtons = function () {
    var that = this;
    var options = this.field.fields[0].field.fields[0].options;

    var buttons = [];
    for (var i = 0; i < options.length; i++) {
      buttons.push(this.getButton(options[i]));
    }

    buttons.push({
      id: 'dropzone',
      title: 'Drop Zone',
      createElement: function () {
        that.params.dropZones.push({
          x: 0,
          y: 0,
          width: 5,
          height: 2.5,
          correctElements: []
        });

        return that.insertDropZone(that.params.dropZones.length - 1);
      }
    });

    return buttons;
  };

  /**
   *
   * @param {type} library
   * @returns {undefined}
   */
  C.prototype.getButton = function (library) {
    var that = this;
    var id = library.split(' ')[0].split('.')[1].toLowerCase();

    return {
      id: id,
      title: C.t('insertElement', {':type': id}),
      createElement: function () {
        that.params.elements.push({
          type: {
            library: library,
            params: {}
          },
          x: 0,
          y: 0,
          width: 5,
          height: 2.5,
          dropZones: []
        });

        return that.insertElement(that.params.elements.length - 1);
      }
    };
  };

  /**
   * Insert element at given params index.
   *
   * @param {int} index
   * @returns {undefined}
   */
  C.prototype.insertElement = function (index) {
    var that = this;
    var elementParams = this.params.elements[index];
    var element = this.generateForm(this.field.fields[0].field.fields, elementParams);

    element.instance = new I(elementParams.type);

    element.$element = $('<div class="h5p-dq-element" style="width:' + elementParams.width + 'em;height:' + elementParams.height + 'em;top:' + elementParams.y + '%;left:' + elementParams.x + '%">' + index + '</div>').appendTo(this.$editor).data('id', index).mousedown(function (event) {
      that.dnb.dnd.press(element.$element, event.pageX, event.pageY);
      return false;
    }).dblclick(function () {
      that.editElement(element);
    });

    element.instance.attach(element.$element);
    this.elements[index] = element;

    return element.$element;
  };

  /**
   *
   * @param {type} element
   * @returns {undefined}
   */
  C.prototype.editElement = function (element) {
    var that = this;
    var id = element.$element.data('id');

    this.doneCallback = function () {
      // Validate form
      var valid = true;
      for (var i = 0; i < element.children.length; i++) {
        if (element.children[i].validate() === false) {
          valid = false;
          break;
        }
      }
      if (!valid) {
        return false;
      }

      element.instance = new I(that.params.elements[id].type);
      element.instance.attach(element.$element);
    };

    this.removeCallback = function () {
      // Remove element form
      H5PEditor.removeChildren(element.children);

      // Remove element
      element.$element.remove();
      that.elements.splice(id, 1);
      that.params.elements.splice(id, 1);

      // Reindex all elements
      for (var i = 0; i < that.elements.length; i++) {
        that.elements[i].$element.data('id', i);
      }
    };

    this.showDialog(element.$form);
  };

  /**
   *
   * @param {type} index
   * @returns {unresolved}
   */
  C.prototype.insertDropZone = function (index) {
    var that = this;
    var dropZone = this.params.dropZones[index];

    //this.dropZoneForms[i] = this.generateElementForm(this.field.fields[1].field.fields, this.params.dropZones[i]);

    var $dropZone = $('<div class="h5p-dq-dz" style="width:' + dropZone.width + 'em;height:' + dropZone.height + 'em;top:' + dropZone.y + '%;left:' + dropZone.x + '%">' + (dropZone.title !== undefined ? '<div class=="h5p-dq-label">' + dropZone.title + '</div>' : '') + '</div>').appendTo(this.$editor).data('id', index).mousedown(function (event) {
      that.dnb.dnd.press($dropZone, event.pageX, event.pageY);
      return false;
    }).dblclick(function () {
      // Edit
      console.log('Editing', dropZone);
    });

    return $dropZone;
  };

  /**
   *
   * @param {type} $form
   * @returns {undefined}
   */
  C.prototype.showDialog = function ($form) {
    this.$currentForm = $form;
    $form.appendTo(this.$dialogInner);
    this.$dialog.show();
    this.$editor.add(this.$dnbWrapper).hide();
    if (this.dnb !== undefined && this.dnb.dnd.$coordinates !== undefined) {
      this.dnb.dnd.$coordinates.remove();
      delete this.dnb.dnd.$coordinates;
    }
  };

  /**
   *
   * @returns {undefined}
   */
  C.prototype.hideDialog = function () {
    this.$currentForm.detach();
    this.$dialog.hide();
    this.$editor.add(this.$dnbWrapper).show();
  };

  /**
   * Validate the current field.
   *
   * @returns {Boolean}
   */
  C.prototype.validate = function () {
    return true;
  };

  /**
   * Collect functions to execute once the tree is complete.
   *
   * @param {function} ready
   * @returns {undefined}
   */
  C.prototype.ready = function (ready) {
    if (this.passReadies) {
      this.parent.ready(ready);
    }
    else {
      this.readies.push(ready);
    }
  };

  /**
   * Translate UI texts for this library.
   *
   * @param {String} key
   * @param {Object} vars
   * @returns {@exp;H5PEditor@call;t}
   */
  C.t = function (key, vars) {
    return H5PEditor.t('H5PEditor.DragQuestion', key, vars);
  };

  return C;
})(H5P.jQuery);

// Default english translations
H5PEditor.language['H5PEditor.DragQuestion'] = {
  libraryStrings: {
    insertElement: 'Insert :type',
    done: 'FÆRDI',
    remove: 'FJÆRN'
  }
};
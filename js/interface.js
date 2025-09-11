var widgetInstanceId = $('[data-widget-id]').data('widget-id');
var widgetInstanceData = Fliplet.Widget.getData(widgetInstanceId) || {};
var customAppsList = Fliplet.Navigate.Apps.list();
var defaultTransitionVal = 'fade';
var selectDefaultPage = true;
var $sections = {};
var optionsValues = {};

var fields = [
  'linkLabel',
  'action',
  'logoutAction',
  'page',
  'transition',
  'url',
  'query',
  'functionStr'
];

var btnSelector = {
  document: '.add-document',
  video: '.add-video'
};

var externalAppValueMap = {
  'gdrive.folder': 'appGDriveFolder',
  'gdrive.file': 'appGDriveDocument',
  'gdocs.document': 'appGoogleDocument',
  'gsheets.spreadsheet': 'appGoogleSheets',
  'gslides.presentation': 'appGooglePresentation',
  'gmail.compose': 'appGmail',
  'googlechrome.website': 'appGoogleChromeWebsite'
};

var emailTemplateAddProvider;
var providerInstance;
var files = $.extend(widgetInstanceData.files, {
  selectedFiles: {},
  selectFiles: [], // To use the restore on File Picker
  selectMultiple: false,
  type: ''
});

var config = files;

if (files.id) {
  config.selectFiles.push({
    appId: files.appId ? files.appId : undefined,
    organizationId: files.organizationId ? files.organizationId : undefined,
    mediaFolderId: files.mediaFolderId ? files.mediaFolderId : undefined,
    parentId: files.parentId ? files.parentId : undefined,
    contentType: files.contentType ? files.contentType : undefined,
    id: files.id ? files.id : undefined
  });
}

var emailProviderData = $.extend(true, {
  subject: '',
  html: '',
  to: []
}, widgetInstanceData.appData ? widgetInstanceData.appData.untouchedData : {});

// Show "Open app" feature to specific organizations while in beta
Fliplet.Organizations.get().then(function(organizations) {
  var valid = organizations.some(function(org) {
    return [8, 64, 70].indexOf(org.id) !== -1 || org.name.toLowerCase().indexOf('fliplet') !== -1;
  });

  if (!valid) {
    $('#action option[value="app"]').remove();
  }
});

// Add custom app actions to the html
var $appAction = $('#appAction');

Object.keys(customAppsList).forEach(function(appName) {
  var app = customAppsList[appName];

  if (app.actions) {
    var $opt = $('<optgroup label="' + app.label + '"></optgroup>');

    Object.keys(app.actions).forEach(function(actionName) {
      var action = app.actions[actionName];

      $opt.append('<option value="' + appName + '.' + actionName + '">' + action.label + '</option>');
    });

    $appAction.append($opt);
  }
});

Object.keys(btnSelector).forEach(function(key) {
  var selector = btnSelector[key];

  $(selector).on('click', function(e) {
    e.preventDefault();

    if ($(this).hasClass('add-document')) {
      config.type = 'document';
    } else if ($(this).hasClass('add-video')) {
      config.type = 'video';
    }

    Fliplet.Widget.toggleSaveButton(Object.keys(config.selectedFiles).length > 0);

    Fliplet.Studio.emit('widget-save-label-update', {
      text: 'Save'
    });

    providerInstance = Fliplet.Widget.open('com.fliplet.file-picker', {
      data: config,
      onEvent: function(e, data) {
        switch (e) {
          case 'widget-rendered':
            break;
          case 'widget-set-info':
            Fliplet.Widget.toggleSaveButton(!!data.length);

            var msg = data.length ? data.length + ' files selected' : 'no selected files';

            Fliplet.Widget.info(msg);
            break;
          default:
            break;
        }
      }
    });

    providerInstance.then(function(data) {
      Fliplet.Studio.emit('widget-save-label-update', {
        text: 'Save & Close'
      });
      Fliplet.Widget.emit('file-picker-closed');
      Fliplet.Widget.info('');
      Fliplet.Widget.toggleCancelButton(true);
      Fliplet.Widget.toggleSaveButton(true);
      files.selectedFiles = data.data.length === 1 ? data.data[0] : data.data;
      providerInstance = null;

      if (key === 'document') {
        $('.document .add-document').text('Replace document');
        $('.document .info-holder').removeClass('hidden');
        $('.document .file-title span').text(files.selectedFiles.name);
        Fliplet.Widget.autosize();
      } else if (key === 'video') {
        $('.video .add-video').text('Replace video');
        $('.video .info-holder').removeClass('hidden');
        $('.video .file-title span').text(files.selectedFiles.name);
        Fliplet.Widget.autosize();
      }
    });
  });
});

$(window).on('resize', Fliplet.Widget.autosize);

function getLapContext() {
  return Fliplet.Widget.findParents({
    isProvider: true
  }).then(function(parents) {
    const context = {
      inDataContainer: false,
      inSlide: false,
      inSlider: false,
      inSlideContainer: false,
      parents
    };

    parents.forEach(function(parent) {
      //  Detect Data Container (record-container / list-repeater)
      if (parent.package === 'com.fliplet.record-container' ||
        parent.package === 'com.fliplet.list-repeater') {
        context.inDataContainer = true;
      }

      //  Detect Slide
      if (parent.package === 'com.fliplet.slide') {
        context.inSlide = true;
      }

      //  Detect Slider container
      if (parent.package === 'com.fliplet.slider-container') {
        context.inSlider = true;
      }
    });

    //  Mark combined condition
    if (context.inSlide && context.inSlider) {
      context.inSlideContainer = true;
    }

    return context;
  });
}

function navigateSlide(direction) {
  getLapContext().then(context => {
    const slideParent = context.parents.find(p => p.nodeName === 'slide');
    const sliderParent = context.parents.find(p => p.nodeName === 'slider');

    if (!slideParent || !sliderParent) return;

    // Get the slider widget instance
    const sliderWidget = Fliplet.Widget.get(sliderParent.id); // <--- important

    if (!sliderWidget || !sliderWidget.swiper) return;

    const swiper = sliderWidget.swiper;

    // Check boundaries
    if (direction === 'next' && (!swiper.allowSlideNext || swiper.isEnd)) return;
    if (direction === 'prev' && (!swiper.allowSlidePrev || swiper.isBeginning)) return;

    if (direction === 'next') swiper.slideNext();
    if (direction === 'prev') swiper.slidePrev();
  });
}

Fliplet.Widget.addEventListener('navigate-slide', function(event) {
  const direction = event.data.direction; // 'next' or 'prev'
  navigateSlide(direction);
});



const actionContextMap = {
  addEntry: ['dataContainer'],
  editEntry: ['dataContainer'],
  deleteEntry: ['dataContainer'],
  email: ['dataContainer'],
  telephone: ['dataContainer'],
  chat: ['dataContainer'],
  nextSlide: ['slideContainer'],
  previousSlide: ['slideContainer'],
  screen: ['any'],
  url: ['any'],
  document: ['any'],
  video: ['any'],
  app: ['any'],
  logout: ['any'],
  runFunction: ['any'],
  back: ['any'],
  'exit-app': ['any'],
  'about-overlay': ['any'],
  none: ['any']
};


function filterAvailableActions(context) {
  $('#action option').each(function() {
    const $option = $(this);
    const value = $option.attr('value');
    const allowedContexts = actionContextMap[value] || [];

    let isAllowed = false;

    if (allowedContexts.includes('any')) {
      isAllowed = true;
    }
    if (allowedContexts.includes('dataContainer') && context.inDataContainer) {
      isAllowed = true;
    }
    if (allowedContexts.includes('slideContainer') && context.inSlideContainer) {
      isAllowed = true;
    }

    if (!isAllowed) {
      $option.hide(); // remove from dropdown
    } else {
      $option.show();
    }
  });
}



/* Show/hide toggle function for sections on the same level.
This is important for cases when we have a dropdown with additional sections on the inner levels (i.e logout) */
function showSection(sectionDataKey, selectId) {
  optionsValues[selectId].forEach(function(key) {
    if ($sections[key]) {
      // Check if the section’s data-key contains the selected action
      var keys = $sections[key].data('key').split(/\s+/);
      $sections[key].toggleClass('show', keys.includes(sectionDataKey));
    }
  });
}

function onActionChange() {
  var $element = $(this);
  var selectedAction = $element.val();
  var fileType = files.contentType ? files.contentType.split('/')[0] : '';
  var selectId = $element.attr('id');

  // this is used to clear uploaded file if user changes link type
  if (!_.isEmpty(files.selectedFiles) || (selectedAction === 'document' && fileType !== 'application') || (selectedAction === 'video' && fileType !== 'video')) {
    clearUploadedFiles();
  }

  if (selectedAction === 'addEntry' || selectedAction === 'editEntry') {
    $('#pageLabel').text('Select a screen with a form');
  } else if (selectedAction === 'deleteEntry') {
    $('#pageLabel').text('Select a screen to take user after');
  } else {
    $('#pageLabel').text('Select a screen');
  }

  showSection(selectedAction, selectId);

  // Toggle delete-only fields
  if (selectedAction === 'deleteEntry') {
    $('#delete-fields').removeClass('hidden');
  } else {
    $('#delete-fields').addClass('hidden');
  }

  if (selectedAction === 'logout') {
    $('#logoutAction').trigger('change');
  }

  $('#showVariables').addClass('hidden');
  $('#hideVariables').addClass('hidden');

  clearVariables();

  if (selectedAction === 'runFunction') {
    $('#runFunctionSection').trigger('change');

    if (widgetInstanceData.variables && widgetInstanceData.variables.length) {
      $('#showVariables').removeClass('hidden');
    }
  }

  Fliplet.Studio.emit('widget-changed');

  /* Fliplet.Widget.emit(validInputEventName, {
    isValid: selectedValue !== 'none'
  });*/

  // Tells the parent widget this provider has changed its interface height
  Fliplet.Widget.autosize();
}

function clearUploadedFiles() {
  files.selectedFiles = {};
  files.selectFiles = [];

  ['document', 'video'].forEach(function(fileType) {
    $('.' + fileType + ' .add-' + fileType).text('Browse your media library');
    $('.' + fileType + ' .info-holder').addClass('hidden');
    $('.' + fileType + ' .file-title span').text('');
  });
}

function renderVariables() {
  var availableVariables = $('#availableVariables');

  widgetInstanceData.variables.forEach(function(variable) {
    var row = $('<div class="variable-row">');

    var content = $(`<p><span class="info-holder">this.${variable.name}</span> - ${variable.description}</p>`);

    row.append(content);

    availableVariables.append(row);
  });
}

function clearVariables() {
  $('#variablesContainer').addClass('hidden');
  $('#availableVariables').empty();
}

$('#showVariables').on('click', function() {
  $(this).addClass('hidden');
  $('#hideVariables').removeClass('hidden');
  $('#variablesContainer').removeClass('hidden');

  renderVariables();

  Fliplet.Widget.autosize();
});

$('#deleteConfirmDialog').on('change', function() {
  if ($(this).is(':checked')) {
    $('#deleteMessage').closest('.form-group').show();
  } else {
    $('#deleteMessage').closest('.form-group').hide();
  }
}).trigger('change'); // run once on load



$('#hideVariables').on('click', function() {
  $(this).addClass('hidden');
  $('#showVariables').removeClass('hidden');

  clearVariables();

  Fliplet.Widget.autosize();
});

$appAction.on('change', function onAppActionChange() {
  var value = $(this).val();

  // Hide visible fields if any
  $('.appLinkFields').removeClass('show');
  // Shows the correct field based on the value
  $('.' + externalAppValueMap[value]).addClass('show');
  // Tells the parent widget this provider has changed its interface height
  Fliplet.Widget.autosize();
});

/* Caching all <section> elements to reduce DOM parsing.
   Each <section> element is hidden by css and connected through [data-key] attribute with specific <option> by value. */
$('section').each(function(index, element) {
  var $section = $(element);
  var sectionDataKeys = $section.data('key').split(/\s+/);

  sectionDataKeys.forEach(function(key) {
    $sections[key] = $section;
  });
});

// Caching and grouping all <options> to show and hide their corresponding sections
$('.action-configurator').each(function(index, element) {
  var $select = $(element);
  var selectId = $select.attr('id');

  optionsValues[selectId] = [];
  $select.find('option').each(function(index, element) {
    optionsValues[selectId].push($(element).val());
  });
  $select.on('change', onActionChange);
});

$('#add-query').on('click', function() {
  $(this).addClass('hidden');
  $(this).parents('#screen-form').addClass('show-query');
  Fliplet.Widget.autosize();
});

$('#query').on('change', function() {
  if ($(this).val() !== '') {
    $('#add-query').trigger('click');
  }
});

$('#functionStr').on('change', function() {
  var regex = /^(this\.)?[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)*(\(\))?$/;
  var defaultError = Fliplet.Locale.translate(`${$(this).val()} is not a valid function name`);

  $(this).siblings('.error-success-message').removeClass('text-danger text-success').html('');

  if ($(this).val() && !regex.test($(this).val())) {
    $(this).siblings('.error-success-message').addClass('text-danger').html(defaultError);

    return;
  }
});

$('.document-remove').on('click', function() {
  files.selectedFiles = {};
  files.selectFiles = [];
  files.toRemove = true;
  $('.document .add-document').text('Browse your media library');
  $('.document .info-holder').addClass('hidden');
  $('.document .file-title span').text('');
  Fliplet.Widget.autosize();
});

$('.video-remove').on('click', function() {
  files.selectedFiles = {};
  files.selectFiles = [];
  files.toRemove = true;
  $('.video .add-video').text('Browse your media library');
  $('.video .info-holder').addClass('hidden');
  $('.video .file-title span').text('');
  Fliplet.Widget.autosize();
});
$('#page').on('change', function() {
  Fliplet.Widget.emit('onPageChange', $(this).val());
});

$.each(externalAppValueMap, function(key) {
  $('#' + externalAppValueMap[key]).on('change input', function() {
    var url = $(this).val();

    $(this).siblings('.error-success-message').removeClass('text-danger text-success').html('');

    if (!Fliplet.Navigate.Apps.validateInput(key, url)) {
      $(this).siblings('.error-success-message').addClass('text-danger').html('URL isn\'t a valid action. Your app will fail to open this URL.');

      return;
    }

    $(this).siblings('.error-success-message').addClass('text-success').html('✅ URL is valid');
  });
});

Fliplet.Studio.onMessage(function(event) {
  if (event.data) {
    switch (event.data.event) {
      case 'page-field-error':
        $('#screen-list').addClass('has-error');

        break;
      case 'reset-page-field-error':
        $('#screen-list').removeClass('has-error');

        break;
      case 'widget-autosize':
        Fliplet.Widget.autosize();

        break;
      default:
        break;
    }
  }
});

$('.configureEmailTemplate').on('click', function() {
  // @TODO: Add saved data OR default
  emailProviderData.options = {
    hideReplyTo: true,
    usage: {
      appName: 'Insert your app name',
      organisationName: 'Insert your organisation name'
    }
  };

  emailTemplateAddProvider = Fliplet.Widget.open('com.fliplet.email-provider', {
    data: emailProviderData
  });

  emailTemplateAddProvider.then(function onForwardEmailProvider(result) {
    emailProviderData = result.data;
    emailTemplateAddProvider = null;
    Fliplet.Widget.autosize();
  });
});

if (widgetInstanceData.action === 'app' && widgetInstanceData.app) {
  $appAction.find('option[value="' + widgetInstanceData.app + '"]').attr('selected', 'selected');
}

Fliplet.Widget.onSaveRequest(function() {
  if (providerInstance) {
    return providerInstance.forwardSaveRequest();
  }

  if (emailTemplateAddProvider) {
    return emailTemplateAddProvider.forwardSaveRequest();
  }

  save(true);
});

Fliplet.Widget.onCancelRequest(function() {
  if (emailTemplateAddProvider) {
    emailTemplateAddProvider.close();
    emailTemplateAddProvider = null;

    return;
  }

  if (providerInstance) {
    providerInstance.close();
    providerInstance = null;
    Fliplet.Studio.emit('widget-save-label-update', {
      text: 'Save & Close'
    });
    Fliplet.Widget.emit('file-picker-closed');
    Fliplet.Widget.toggleCancelButton(true);
    Fliplet.Widget.toggleSaveButton(true);
    Fliplet.Widget.info('');
  }
});

// Save data when submitting the form
function save(notifyComplete) {
  // Clean data to store the new saved values
  var data = {};

  // Attach options from widgetInstanceData
  data.options = widgetInstanceData.options;

  // Get and save values to data
  fields.forEach(function(fieldId) {
    data[fieldId] = $('#' + fieldId).val();
  });

  var appAction = $appAction.val();

  if (data.action === 'app' && appAction) {
    data.app = appAction;
    data.appData = {};

    if (data.app === 'gmail.compose') {
      data.appData.untouchedData = emailProviderData;
      data.appData.body = emailProviderData.html;
      data.appData.subject = emailProviderData.subject;

      // All recipients are found in the "emailProviderData.to" array, but with "type"
      // defining whether they are "to" or "cc" or "bcc" recipients.
      data.appData.to = _.find(emailProviderData.to, function(o) {
        return o.type === 'to';
      }) || '';
      data.appData.cc = _.find(emailProviderData.to, function(o) {
        return o.type === 'cc';
      }) || '';
      data.appData.bcc = _.find(emailProviderData.to, function(o) {
        return o.type === 'bcc';
      }) || '';
    } else if (data.app === 'googlechrome.website') {
      data.appData.url = $('#' + externalAppValueMap[appAction]).val();
    } else {
      var urlValue = $('#' + externalAppValueMap[appAction]).val();
      var result;

      data.appData.fullUrl = urlValue;

      if (appAction === 'gdocs.document' || appAction === 'gdocs.spreadsheet' || appAction === 'gdocs.presentation') {
        result = urlValue.match(/\/d\/([A-z0-9-_]+)/);
        data.appData.id = result.length && result[1];
      }

      if (appAction === 'gdrive.folder') {
        result = urlValue.match(/folders\/([A-z0-9-_]+)/);
        data.appData.id = result.length && result[1];
      }

      if (appAction === 'gdrive.file') {
        result = urlValue.match(/open\?.?id=([A-z0-9-_]+)/);
        data.appData.id = result.length && result[1];
      }
    }
  }

  if (data.action === 'runFunction') {
    if ($('#functionStr').siblings('.error-success-message').hasClass('text-danger')) {
      return;
    }
  }

  if (data.url && !data.url.match(/^[A-z]+:/i)) {
    data.url = 'http://' + data.url;
  }

  if (['document', 'video'].indexOf(data.action) !== -1) {
    if (files.toRemove) {
      data.files = {};
    } else {
      data.files = _.isEmpty(files.selectedFiles) ? files : files.selectedFiles;
    }
  }

  // cleanup
  ['url', 'query', 'page'].forEach(function(key) {
    if (data[key] === '') {
      delete data[key];
    }
  });

  if (data.logoutAction && data.action !== 'logout') {
    delete data['logoutAction'];
  }

  if (data.action !== 'runFunction') {
    delete data['functionStr'];
  }

  if (notifyComplete) {
    // TODO: validate query
    Fliplet.Widget.save(data).then(function() {
      Fliplet.Widget.complete();
    });
  } else {
    Fliplet.Widget.save(data).then(function() {
      Fliplet.Studio.emit('reload-widget-instance', widgetInstanceId);
    });
  }
}

function initializeData() {
  if (widgetInstanceData.action) {
    fields.forEach(function(fieldId) {
      // skipping "change" event on the inner sections selects to prevent hide of the top level sections
      if (fieldId === 'logoutAction') {
        return;
      }

      $('#' + fieldId).val(widgetInstanceData[fieldId]).trigger('change');
      Fliplet.Widget.autosize();
    });

    if (widgetInstanceData.action === 'runFunction') {
      $('#functionStr').val(widgetInstanceData.functionStr).trigger('change');
    }

    if (widgetInstanceData.action === 'logout') {
      $('#logoutAction').val(widgetInstanceData.logoutAction).trigger('change');
    }

    if (widgetInstanceData.action === 'app' && widgetInstanceData.app) {
      $appAction.val(widgetInstanceData.app);
      $appAction.trigger('change');

      var url = widgetInstanceData.appData.fullUrl || widgetInstanceData.appData.url;

      if (widgetInstanceData.appData && url) {
        $('#' + externalAppValueMap[widgetInstanceData.app]).val(url);
      }
    }

    $('.spinner-holder').removeClass('animated');

    if (selectDefaultPage) {
      $('#page').val('none');
    }

    return;
  }

  $('.spinner-holder').removeClass('animated');
  $('#transition').val(defaultTransitionVal).trigger('change');

  if (selectDefaultPage) {
    $('#page').val('none');
  }
}

Fliplet.Pages.get()
  .then(function(pages) {
    var $select = $('#page');

    (pages || []).forEach(function(page) {
      var pageIsOmitted = _.some(widgetInstanceData.omitPages, function(omittedPage) {
        return omittedPage === page.id;
      });

      if (pageIsOmitted) {
        return;
      }

      if (widgetInstanceData.page) {
        selectDefaultPage = false;
      }

      $select.append(
        `<option value="${page.id}"${widgetInstanceData.page === page.id.toString() ? ' selected' : ''}>${page.title}</option>`
      );
    });

    return Promise.resolve();
  })
  .then(initializeData);

$(function() {
  getLapContext().then(function(context) {
    console.log('LAP Context:', context);
    filterAvailableActions(context);
  });
});


Fliplet.Widget.autosize();
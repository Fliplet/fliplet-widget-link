var widgetInstanceId = $('[data-widget-id]').data('widget-id');
var widgetInstanceData = Fliplet.Widget.getData(widgetInstanceId) || {};
var customAppsList = Fliplet.Navigate.Apps.list();
var defaultTransitionVal = 'fade';
var selectDefaultPage = true;

var fields = [
  'linkLabel',
  'action',
  'page',
  'transition',
  'url',
  'query'
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

// Only Fliplet, "Colgate" and "Hills Pet Nutirition" can see the "Open app" feature while it's on beta
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

$('#action').on('change', function onLinkTypeChange() {
  var selectedValue = $(this).val();
  $('.section.show').removeClass('show');
  $('#' + selectedValue + 'Section').addClass('show');

  var fileType = files.contentType ? files.contentType.split('/')[0] : '';

  // this is used to clear uploaded file if user changes link type
  if (!_.isEmpty(files.selectedFiles) || (selectedValue === 'document' && fileType !== 'application') || (selectedValue === 'video' && fileType !== 'video')) {
    files.selectedFiles = {};
    files.selectFiles = [];

    var items = ['document', 'video'];

    items.forEach(function(item) {
      $('.' + item + ' .add-' + item).text('Browse your media library');
      $('.' + item + ' .info-holder').addClass('hidden');
      $('.' + item + ' .file-title span').text('');
    });
  }

  Fliplet.Studio.emit('widget-changed');

  /* Fliplet.Widget.emit(validInputEventName, {
    isValid: selectedValue !== 'none'
  });*/

  // Tells the parent widget this provider has changed its interface height
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
      data.appData.to = _.find(emailProviderData.to, function(o) { return o.type === 'to'; }) || '';
      data.appData.cc = _.find(emailProviderData.to, function(o) { return o.type === 'cc'; }) || '';
      data.appData.bcc = _.find(emailProviderData.to, function(o) { return o.type === 'bcc'; }) || '';
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

function initialiseData() {
  if (widgetInstanceData.action) {
    fields.forEach(function(fieldId) {
      $('#' + fieldId).val(widgetInstanceData[fieldId]).trigger('change');
      Fliplet.Widget.autosize();
    });

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
      var pageIsOmited = _.some(widgetInstanceData.omitPages, function(omittedPage) {
        return omittedPage === page.id;
      });

      if (pageIsOmited) {
        return;
      }

      if (widgetInstanceData.page) {
        selectDefaultPage = false;
      }

      $select.append(
        '<option value="' + page.id + '"' +
        (widgetInstanceData.page === page.id.toString() ? ' selected' : '') +
        '>' + page.title + '</option>'
      );
    });

    return Promise.resolve();
  })
  .then(initialiseData);

Fliplet.Widget.autosize();

$(function () {
    
    bootbox.setDefaults({
        onEscape: true,
        size: 'small'
    });
    
    // set default AJAX options
    $.ajaxSetup({ cache: false });

    // activate current navbar item
    $('#navbar-collapse li > a[href!="#"]').each(function () {
        if (window.location.href.indexOf(this.href) > -1) {
            $(this).parent().addClass('active');
            return false;
        }
    });

    // wrap tables with  special container 
    $('.dim, .stretch').each(function() {
        var elem = $(this), div = $('<div/>');
        if (elem.hasClass('stretch')) {
            div.addClass('stretch-wrap');
        }
        if (elem.hasClass('dim')) {
            div.addClass('dim-wrap');
        }
        elem.wrap(div);

        if (elem.hasClass('dim')) {
            elem.after('<div class="dimmer"></div>'); // overlay
        }
    });

    // checked/unchecked all table-body checkboxes when table-header checkbox is checked/unchecked
    $(document).on('change', 'th > :checkbox', function () {
        var checkbox = $(this), 
            index = checkbox.parent().index();
        checkbox.closest('table').find('tr').each(function () {
            $('td:eq(' + index + ') > :checkbox:not(:disabled)', this).prop('checked', checkbox[0].checked);
        });
    });

    // style checkboxes with switch control
    $(":checkbox.bootstrap-switch").bootstrapSwitch({
        inverse: true,
        offText: 'No',
        onText: 'Yes'
    });

    // $('.collapse').on('hidden.bs.collapse shown.bs.collapse', function (e) {
    //     console.log(e);
    //     var link = $('a[data-target="#' + this.id + '"]'),
    //         text = link.text(), 
    //         dataText = link.data('text');
    //     link.text(dataText).attr('data-text', text);
    // });

    // save last opened tab
    $('a[data-toggle=tab]').on('shown.bs.tab', function () {
        localStorage.setItem('tab-open', $(this).attr('href'));
    });
    // open last opened tab
    var tab = localStorage.getItem('tab-open');
    if (tab) {
        $('a[href="' + tab + '"]').tab('show');
    }

    // toggle checkbox-radios
    $(document).on('click', '.btn-circle', function (e) {
        var btn = $(this).toggleClass('active'), 
            input = $('input', btn).prop('checked', btn.hasClass('active'));
        // inactivate other checkbox-radios if they belong to the same group
        if (input.data('group')) {
            $(e.delegateTarget).find('.btn-circle').has('[data-group=' + input.data('group') + ']').not(btn).each(function () {
                $(this).removeClass('active').find('input').prop('checked', false);
            });
        }
    // create checkbox-radios
    }).find(':checkbox[data-label]').each(function() {
        $(this)
            .wrap('<div class="btn-circle' + (this.checked ? ' active' : '') + '"></div>')
            .before('<label>' + this.dataset.label + '</label>');
    });

    // $('.container').radioCheckbox({ delegate: ':checkbox' })

    // $.fn.radioCheckbox = function (options) {

    //     this.on('click', options.delegate, function (e) {
    //         var btn = $(this).toggleClass('active'), 
    //             input = $('input', btn).prop('checked', btn.hasClass('active'));
    //         // inactivate other checkbox-radios if they belong to the same group
    //         if (input.data('group')) {
    //             $(e.delegateTarget).find('.btn-circle').has('[data-group=' + input.data('group') + ']').not(btn).each(function () {
    //                 $(this).removeClass('active').find('input').prop('checked', false);
    //             });
    //         }
    //     });

    //     return this.each(function () {
    //         // var btn = $(this), input = $('input', btn);

    //         // btn.toggleClass('active');
    //         // input.prop('checked', btn.hasClass('active'));

    //         // // inactivate other checkbox-radios if they belong to the same group
    //         // if (input.data('group')) {
    //         //     $(e.delegateTarget).find('.btn-circle').has('[data-group=' + input.data('group') + ']').not(btn).each(function () {
    //         //         $(this).removeClass('active').find('input').prop('checked', false);
    //         //     });
    //         // }

    //         var input = $(this);
    //         input.before('<label>' + this.dataset.label + '</label>');
    //         input.wrap('<div class="btn-circle' + (this.checked ? ' active' : '') + '"></div>');
    //     });
    // };

    // small plugins for making PUT and DELETE requests
    // @usage: $.put(url, data, callback) or $.delete(url, callback)
    $.each(['put', 'delete'], function (i, method) {
        $[method] = function (url, data, callback, type) {
            if ($.isFunction(data)) {
                type = type || callback;
                callback = data;
                data = undefined;
            }
            return $.ajax({
                url: url,
                type: method,
                dataType: type,
                data: data,
                success: callback
            });
        };
    });

    // small plugin for showing/hiding selector and enabling/disabling its children
    // @usage: $(selector).enableToggle(true|false)
    $.fn.enableToggle = function (display) {
        this.toggle(display).find(':input').prop('disabled', !display);
        return this;
    };

    // small plugin for creating confirm dialogs on the fly
    // @usage: $.deletebox(options)
    $.deletebox = function (options) {
        bootbox.dialog({
            title: options.title,
            message: options.message,
            buttons: {
                cancel: {
                    label: 'Cancel',
                    className: 'btn-sm'
                },
                danger: {
                    label: 'Delete',
                    className: 'btn-sm btn-danger',
                    callback: function (result) {
                        if (result) {
                            options.callback();
                        }
                    }
                }
            }
        });
    };
});
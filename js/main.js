$(document).ready(function () {
    var errClass = "error";
	console.log( "start-s-p" );
    $('#payment .prop_pay_summ input[type="text"]').change(function () {
        var amount = $(this).val().replace(/,/, '.').replace(/\s+/g, '');
        amount = Math.round(amount * 100) / 100;
        $(this).val(amount);
        if (amount < window.settings.minAmount) {
            $(this).addClass(errClass);
        } else {
            $(this).removeClass(errClass);
        }
    });

    $('#payment #personal').on('click', function (e) {
        var t = $(this);
        if (t.prop('checked')) {
            t.parent().removeClass(errClass);
        } else {
            t.parent().addClass(errClass);
        }
    });

    $('.personal b').on('click', function () {
        $('#payment #personal').trigger('click');
    });

    $("#payment input[data-type='-'].required").change(function () {
        var t = $(this);
        var tv = t.val();
        if (tv == '') {
            t.addClass(errClass);
        } else {
            t.removeClass(errClass);
        }
    });

    $("#payment input[data-type='email'].required").change(function () {
        var t = $(this);
        if (checkEmail(t)) {
            t.addClass(errClass);
        } else {
            t.removeClass(errClass);
        }
    });

    $("#payment .prop_pay_summ input").change(function () {
        var t = $(this);
        var tv = t.val();
        if ((tv != '') && $.isNumeric(tv) && (tv >= window.settings.minAmount)) {
            t.removeClass(errClass);
        } else {
            t.addClass(errClass);
        }
    });

    $("#payment select").change(function () {
        var t = $(this);
        var tv = t.val();
        if (t.hasClass('required') && tv == "none") {
            t.addClass(errClass);
        } else {
            t.removeClass(errClass);
        }
    });

    $("#payment #service").change(function () {
        var service = $(this).val();
        $('#payment .service_values').find('select, input').removeClass('required');
        $('#payment .service_values').hide();
        if (service != 'none') {
            $('#payment #' + service).find('select, input[data-required="true"]').addClass('required');
            $("#payment #" + service).show();
        }
    });

    $('#payment input[data-type="phone"]').inputmask("+7 9{3} 9{3} 9{2}-9{2}");

    if (window.resultData.hasOwnProperty('result')) {
        var checkOrderNeeded = window.resultData.hasOwnProperty('oid') && window.resultData.oid &&
                window.resultData.hasOwnProperty('boid') && window.resultData.boid;
        var msg = checkOrderNeeded ?
                "<p>Проверяем состояние оплаты<span class='counter'></span></p>" :
                '<div class="error-modal" ><h2>Ошибка</h2><p>Не удалось найти оплату.<br>Если Вы уверены, в том, что оплатили, проверьте информацию в нашей бухгалтерии.</p></div>';
        if (checkOrderNeeded) {
            showLoader(msg);
            var data = {
                sessid: window.settings.sessid,
                rt: 'sber_check_payment',
                data: window.resultData
            };
            $.ajax({
                method: "post",
                url: window.settings.ajax_url,
                dataType: "json",
                data: data,
                success: function (rdata) {
                    window.loaderFB.close();
                    clearInterval(window.loaderInterval);
                    window.responseFB = $.fancybox.open($('#response-modal').html(rdata.msg));
                },
                error: function (data, status, e) {
                    window.loaderFB.close();
                    window.responseFB = $.fancybox.open($('#response-modal').html('<div class="error-modal" ><h2>Ошибка</h2><p>Произошла ошибка, попробуйте позже...</p></div>'));
                }
            });
        } else {
            $.fancybox.open($('#response-modal').html(msg));
        }
    }

    $("#payment").on("submit", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var F = $(this);
        if (checkInputs(F)) {
            // show loader
            showLoader('<p>Подождите, формируем запрос на оплату<span class="counter"></span><br>Вы будете перенаправлены на страницу оплаты.</p>');
            setTimeout(function () {
                var data = {
                    sessid: window.settings.sessid,
                    rt: 'sber_do_payment',
                    data: collectData(F)
                };
                $.ajax({
                    method: "POST",
                    async: false,
                    url: window.settings.ajax_url,
                    dataType: "json",
                    data: data,
                    success: function (rdata) {
                        window.loaderFB.close();
                        clearInterval(window.loaderInterval);
                        if ((rdata.code > 0) && rdata.hasOwnProperty('redir_url')) {
                            window.location.href = rdata.redir_url;
                        } else if ( (rdata.code > 0) && rdata.hasOwnProperty('redir_auto_form') ) {
							var div = $( "<div>" );
							$( "body" ).append( div );
							div.html( rdata.redir_auto_form ).hide();
							fSubmit();
						} else {
                            window.responseFB = $.fancybox.open($('#response-modal').html('<div class="error-modal" ><h2>Ошибка</h2><p>' + ((rdata.hasOwnProperty("data") && rdata.data.hasOwnProperty('msg')) ? rdata.data.msg : rdata.err) + '</p></div>'));
                        }
                    },
                    error: function (data, status, e) {
                        window.loaderFB.close();
                        window.responseFB = $.fancybox.open($('#response-modal').html('<div class="error-modal" ><h2>Ошибка</h2><p>Произошла ошибка, попробуйте позже...</p></div>'));
                    }
                });
            }, 550);
        }
        return false;
    });
});

function checkInputs(container) {
    var retVal = true;
    var errClass = "error";

    container.find('input[type="text"].required').each(function () {
        var t = $(this);
        var tv = $(this).val();
        var dt = t.attr('data-type');

        t.removeClass(errClass);
        switch (dt) {
            case 'email':
                var emailOk = checkEmail(t);
                if (!emailOk) {
                    t.addClass(errClass);
                    retVal = retVal && false;
                }
                break;
            case 'summ':
                if ((tv == '') || !$.isNumeric(tv) || (tv < window.settings.minAmount)) {
                    t.addClass(errClass);
                    retVal = retVal && false;
                }
                break;
            case 'phone':
                if (!/\+7\s\d{3}\s\d{3}\s\d{2}-\d{2}/.test(tv)) {
                    t.addClass(errClass);
                    retVal = retVal && false;
                }
                break;
            default:
                if (tv.length == 0) {
                    retVal = retVal && false;
                    t.addClass(errClass);
                }
                break;
        }
    });
    container.find('input[type="checkbox"].required').each(function () {
        var t = $(this);
        t.parent().removeClass(errClass);
        var tv = $(this).prop('checked');
        if (!tv) {
            retVal = retVal && false;
            t.parent().addClass(errClass);
        }

    });
    container.find('select.required').each(function () {
        var t = $(this);
        t.removeClass(errClass);
        var tv = $(this).val();
        if ((tv.length == 0) || (tv == "none")) {
            retVal = retVal && false;
            t.addClass(errClass);
        }
    });

    return retVal;
}

function checkEmail(t) {
    var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
    return pattern.test(t.val());
}

function collectData(container) {
    var st = container.find('#service').val();
    var st_text = container.find('#service option:selected').text();
    var retVal = {
        student: $('input[name="order[STUDENT_FIO]"]').val(),
        payer: $('input[name="order[PAYER_FIO]"]').val(),
        summ: $('input[name="order[PAY_SUMM]"').val(),
        phone: $('input[name="order[PHONE]"').val().replace(/[\s|-]/g, ""),
        email: $('input[name="order[EMAIL]"').val(),
        service_type: st_text,
        service_type_id: container.find('#service option:selected').attr("data-id"),
		payment_type: $("[name='payment_type']").val()
    };
	
	if ( $('input[name="deb"]').length )
		retVal["deb"] = 1;
	
    var s = container.find('select[data-name="' + st + '"]');
    if (s.length > 0) {
        retVal.service = s.val();
    }
    if ( st && container.find('#' + st + ' .param').length > 0) {
        retVal.params = [];
        container.find('#' + st + ' .param').each(function () {
            var tn = $(this).find('input[data-type="name"]');
            var tv = $(this).find('input[data-type="value"]');
            retVal.params.push({name: tn.val(), value: tv.val()});
        });
    }
    return retVal;
}

function showLoader(text) {
    window.loaderCounter = 1;
    window.loaderCounterMax = 3;
    window.loaderCounterChar = ".";

    window.loaderFB = $.fancybox.open($("#loader").html(text));
    if (window.hasOwnProperty('loaderInterval')) {
        clearInterval(window.loaderInterval);
    }
    window.loaderInterval = setInterval(function () {
        window.loaderCounter = window.loaderCounter > window.loaderCounterMax ? 1 : window.loaderCounter + 1;
        var counterHtml = window.loaderCounterChar.repeat(window.loaderCounter);
        $("#loader .counter").html(counterHtml);
    }, 500);
}
/* ===========================================================
 * jquery.feedback-form.js
 * v 1.0.0 April 06 2015
 * ===========================================================
 * Copyright 2015 Vladimir Mikhaylovskiy.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

(function($) {

    $.fn.feedbackForm = function(options) {

        var settings = $.extend({
            url: '/',
            method: 'post',
            labels: {},
            validationRules: {'email': {email: true}},
            waitMessage: 'Please wait...',
            invalidMessage: 'Please fill in all data',
            errorMessage: 'Error occurred',
            sentMessage: 'Successfully sent!',
            validationMessages: {
                required: "Field %field% is required",
                email: "Field %field% must be a valid email",
                min: "Field %field% must have more than %param% characters",
                max: "Field %field% must have less than %param% characters",
                number: "Field %field% must be a number"
            },
            onBeforeSend: function(formData) {},
            onAfterSend: function(formData) {},
            onReady: function(response) {},
            onSuccess: function(response) {},
            onFail: function(response) {},
            onError: function(response) {}
        }, options);

        var formElementContainer;
        var formElement;
        var submitButtonContainer;
        var submitButton;
        var errorArea;
        var formInputs = {};

        var renderTemplate = function (template, data){
            if(data)
                return template.replace(/%(\w*)%/g,function(m,key){return data.hasOwnProperty(key)?data[key]:"";});
            else
                return '';
        };

        var isValidEmail = function(emailAddress) {
            var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
            return pattern.test(emailAddress);
        };

        var isEmptyObject = function(obj) {
            for(var prop in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    return false;
                }
            }
            return true;
        };

        var removeErrors = function(){
            formElement.find(':input').removeClass('feedback-form-has-error');
            errorArea.html('');
        };

        var showErrors = function(errors){
            for(var i in errors){
                if(errors.hasOwnProperty(i)) {
                    var inputData = formInputs[i];
                    var errorMessage = errors[i];
                    inputData.element.addClass('feedback-form-has-error');
                    errorArea.append('<div class="feedback-form-error-message">'+errorMessage+'</div>');
                }
            }
        };

        var submit = function(e){
            e.preventDefault();

            blockButton();
            removeErrors();

            var data = collectData();
            var validationResult = validateData(data);

            if(validationResult.valid){
                removeErrors();
                sendRequest(data);
            }
            else{
                showErrors(validationResult.errors);
                releaseButton(settings.invalidMessage);
            }
        };

        var blockButton = function(){
            submitButton.attr('disabled', 'disabled').text(settings.waitMessage).val(settings.waitMessage);
            submitButtonContainer.addClass("loading");
        };

        var finalBlockButton = function(message){
            submitButton.attr('disabled', 'disabled').text(message).val(message);
            submitButtonContainer.removeClass("loading");
        };

        var releaseButton = function(message){
            submitButton.removeAttr('disabled').text(message).val(message);
            submitButtonContainer.removeClass("loading");
        };

        var collectData = function(){
            var data = {};
            for(var i in formInputs){
                if(formInputs.hasOwnProperty(i)) {
                    var item = formInputs[i];
                    data[item.name] = item.element.val();
                }
            }
            return data;
        };

        var validateData = function(data){
            var errors = {};
            for(var i in data){
                if(data.hasOwnProperty(i)) {
                    var validateResult = validateItem(i, data[i]);
                    if(!validateResult.valid){
                        errors[i] = validateResult.message;
                    }
                }
            }
            return {
                valid: isEmptyObject(errors),
                errors: errors
            };
        };

        var validateItem = function(i, value){
            var inputData = formInputs[i];

            if(inputData.required && !value){
                return {valid: false, message: renderTemplate(settings.validationMessages.required, {field: inputData.label})};
            }

            if(settings.validationRules[i]){
                if(settings.validationRules[i].required && !value){
                    return {valid: false, message: renderTemplate(settings.validationMessages.required, {field: inputData.label})};
                }

                if(settings.validationRules[i].email){
                    if(!isValidEmail(value)){
                        return {valid: false, message: renderTemplate(settings.validationMessages.email, {field: inputData.label})};
                    }
                }

                if(settings.validationRules[i].min){
                    if(value.length < settings.validationRules[i].min){
                        return {valid: false, message: renderTemplate(settings.validationMessages.min, {field: inputData.label, param: settings.validationRules[i].min})};
                    }
                }

                if(settings.validationRules[i].max){
                    if(value.length > settings.validationRules[i].max){
                        return {valid: false, message: renderTemplate(settings.validationMessages.max, {field: inputData.label, param: settings.validationRules[i].max})};
                    }
                }

                if(settings.validationRules[i].number){
                    if(!$.isNumeric(value)){
                        return {valid: false, message: renderTemplate(settings.validationMessages.number, {field: inputData.label})};
                    }
                }

                if(settings.validationRules[i].custom){
                    return settings.validationRules[i].custom(value);
                }
            }

            return {valid: true};
        };

        var sendRequest = function(data){

            settings.onBeforeSend(data);

            $.ajax({
                method: settings.method,
                url: settings.url,
                dataType: 'json',
                data: data,
                success: function (response) {
                    settings.onReady(response);
                    if(response.success){
                        settings.onSuccess(response);
                        finalBlockButton(settings.sentMessage);
                    }
                    else{
                        if(response.message){
                            errorArea.html('<div class="feedback-form-error-message">'+response.message+'</div>');
                        }
                        settings.onFail(response);
                        releaseButton(settings.errorMessage);
                    }
                },
                error:  function (response) {
                    settings.onError(response);
                    releaseButton(settings.errorMessage);
                }
            });

            settings.onAfterSend(data);

        };

        var discoverFormInputs = function(){
            formElement.find(':input').each(function(){
                var name = $(this).attr('name');
                if(name) {
                    var id = $(this).attr('id');
                    var label = '';
                    if(settings.labels[name]){
                        label = settings.labels[name];
                    }
                    if (!label) {
                        formElement.find('label[for="' + id + '"]').text();
                        label = label.trim();
                    }
                    if (!label && $(this).data('label')) {
                        label = $(this).data('label');
                    }
                    if (!label && $(this).attr('placeholder')) {
                        label = $(this).attr('placeholder');
                    }
                    if (!label) {
                        label = name;
                    }
                    var required = $(this).attr('required') == true;
                    if(!required){
                        required = $(this).data('required') == true;
                    }

                    formInputs[name] = {
                        id: id,
                        name: name,
                        required: required,
                        label: label,
                        element: $(this)
                    };
                }
            });
        };

        var addPluginMarkup = function(){
            formElement.wrap('<div class="feedback-form-container"></div>');
            formElementContainer = formElement.parent();
            submitButton = formElement.find('input[type="submit"]');
            if(submitButton.length == 0){
                submitButton = formElement.find('button[type="submit"]');
            }
            if(submitButton.length == 0){
                submitButton = formElement.find('a.submit-btn');
            }
            submitButton.wrap('<div class="feedback-form-button-container"></div>');
            submitButtonContainer = formElement.find('.feedback-form-button-container');
            submitButtonContainer.prepend('<i class="feedback-form-icon"></i>');
            formElement.after('<div class="feedback-form-errors"></div>');
            errorArea = formElementContainer.find('.feedback-form-errors');

            if(formElement.attr('action')){
                settings.url = formElement.attr('action');
            }
            if(formElement.attr('method')){
                settings.method = formElement.attr('method');
            }
        };

        return this.each(function() {
            if($(this).attr('feedbackForm') == 'true'){
                return;
            }
            $(this).attr('feedbackForm', 'true');

            formElement = $(this);

            addPluginMarkup();

            discoverFormInputs();

            formElement.bind('submit.feedbackForm', submit);

        });

    };
})(jQuery);
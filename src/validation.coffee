# ## bind-validation
chip.binding 'bind-validation', (element, attr, controller) ->
  controller[attr.value] = {}
  controller.validationGroup = attr.value

# ## validate-*
chip.binding 'validate-*', (element,attr,controller) ->
  # When defining a validation rule, use the following:
  # {x} = field value, {y} = validation option value
  
  ## Example
  # validations =
  #    all:
  #      required:
  #        evaluation: '{x} != ""'
  #        errorMessage: 'This is a required field.'
  #    text:
  #      minLength:
  #        evaluation: '{x}.length >= {y}'
  #        errorMessage: 'This field must be at least {y} characters long.'
  #      maxLength:
  #        evaluation: '{x}.length <= {y}'
  #        errorMessage: 'This field must be at most {y} characters long.'
  #    number:
  #      minValue:
  #        evaluation: '{x} >= {y}'
  #        errorMessage: 'This value must be greater than {y}.'
  #      maxValue:
  #        evaluation: '{x} <= {y}'
  #        errorMessage: 'This value must be less than {y}.'
  #    email:
  #      default:
  #        evaluation: '{y}.match(/@/)'
  #        errorMessage: 'Please enter a valid email address.'

  validations = app.rootController.validations

  type = attr.camel
  # Initially tested for a validation object with typeof, but that felt too
  # rigid, so I simplfied it a bit.

  if attr.value is ''
    options = {}
    options.default = true
  else
    if attr.value.indexOf(':') < 1
      # Loading options as an object passed from the controller
      options = controller.eval(attr.value)
      unless typeof options is 'object'
        options = {}
        options[attr.value] = true
    else
      # Attempt to parse options directly from validation attribute
      # We will probably need to spend more time working out the best format here
      # since passing an object string in the attribute isn't going to work.
      #
      # Currently using the following 'shortcode' for validation options:
      # option:value -e 'This is an optional message'
      #
      # Seperate options with | character (do not love this).
      options = {}
      optsArry = attr.value.split '|'
      for opt in optsArry
        optArry = opt.split ':'
        optionKey = optArry[0].trim()
        optionValMsg = optArry[1].split '-e'
        options[optionKey] = {}
        options[optionKey].value = optionValMsg[0].trim()
        options[optionKey].errorMessage = optionValMsg[1]?.trim()

  element.on 'change', ->
    value = element.val()
    validResponse = validateField(value,type,options)
    if validResponse.valid
      # Do some happy, positive things
      element.removeClass('chip_validation_invalid')
      element.addClass('chip_validation_valid')
    else
      # Scorch the earth with shameful red error messages
      console.error validResponse.errorMsgs
      element.removeClass('chip_validation_valid')
      element.addClass('chip_validation_invalid')
    # In addition to adding / removing CSS classes to elements being validated,
    # a validation object is added to the `validationController` under the
    # named `validationGroup` by the element name.
    # (will only work with simple field names)
    unless controller[controller.validationGroup][element.attr('name')]
      controller[controller.validationGroup][element.attr('name')] = {}
    controller[controller.validationGroup][element.attr('name')] = validResponse

  validateField = (value,type,options) ->
    response = {
      valid:true
      message:''
      errorMsgs:[]
    }

    validateVal = (validation) ->
      if validation.value?
        return validation.value
      else
        return validation

    validateMsg = (validation) ->
      if validation.message?
        return validation.message
      else
        return null
    
    isValid = true
    errorMsgs = []
    for optionName, optionValue of options
      validation = validations[type][optionName] || validations.all[optionName]
      if validation?
        rule = validation.evaluation.replace('{x}','"' + value + '"')
        .replace('{y}',optionValue.value)
        if eval rule
          isValid = true;
        else
          isValid = false
          if validation.errorMessage
            errorMsgs.push validation.errorMessage.replace '{y}',
            optionValue.value
          else
            validation.errorMessage 'Input for this field is invalid.'
      else
        'validation missing'
        response.valid = true;
        console.warn 'Validation method: ' + optionName + ' not found!'
    response.valid = isValid
    response.errorMsgs = errorMsgs
    return response

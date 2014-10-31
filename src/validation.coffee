# ## validate-*
chip.binding 'validate-*', (element,attr,controller) ->
  controller.parent.hasValidation = true
  controller.parent.validation = {}
  type = attr.camel
  # Initially tested for a validation object with typeof, but that felt too
  # rigid, so I simplfied it a bit.
  if attr.value.indexOf(':') < 1
    # Loading options as an object passed from the controller
    options = controller.eval attr.value
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

  # maybe store custom validations to check validation type against
  # customValidations = {}
  
  # Some preset validations
  # Focusing less on the actual validations themselves and more on a way to 
  # evaluate preset and custom validations since every app has different needs.
  #
  # When defining a validation rule, use the following:
  # {x} = field value, {y} = validation option value
  validations =
    all:
      required:
        evaluation: '{x} != ""'
        errorMessage: 'This is a required field.'
    text:
      minLength:
        evaluation: '{x}.length >= {y}'
        errorMessage: 'This field must be at least {y} characters long.'
      maxLength:
        evaluation: '{x}.length <= {y}'
        errorMessage: 'This field must be at most {y} characters long.'
    # numerical:
    #   default: '{x}.match(/0-9/)'
      minValue:
        evaluation: '{x} >= {y}'
        errorMessage: 'This value must be greater than {y}.'
      maxValue:
        evaluation: '{x} <= {y}'
        errorMessage: 'This value must be less than {y}.'
    email:
      default:
        evaluation: '{y}.match(/@/)'
        errorMessage: 'Please enter a valid email address.'

  element.on 'change', ->
    value = element.val()
    validResponse = validateField(value,type,options)
    if validResponse.valid
      # Do some happy, positive things
      console.log 'Hey Slugger, you did it right!'
      element.removeClass('chip_validation_invalid')
      element.addClass('chip_validation_valid')
    else
      # Scorch the earth with shameful red error messages
      console.log 'Nope, not even close. Here\'s where you went wrong, Sparky:'
      console.error validResponse.errorMsgs
      element.removeClass('chip_validation_valid')
      element.addClass('chip_validation_invalid')
    controller.validation.valid = validResponse.valid
    controller.validation.errorMsgs = validResponse.errorMsgs

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

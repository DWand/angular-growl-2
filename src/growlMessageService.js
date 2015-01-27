angular.module("angular-growl").service("growlMessages", ['$sce', '$timeout', function ($sce, $timeout) {
  "use strict";

  var service = this;

  function Directive() {
    this.messages = []; // Queue
    this.limitMessages = undefined;
  }

  Directive.prototype.cutMessages = function() {
    var limit = this.limitMessages;
    if (angular.isNumber(limit) && limit > 0) {
      var messages = this.messages,
          diff = messages.length - limit;
      if (diff > 0) {
        messages.splice(0, diff);
      }
    }
  };

  Directive.prototype.destroyAllMessages = function() {
    var messages = this.messages;
    for (var i = messages.length - 1; i >= 0; i--) {
      messages[i].destroy();
    }
    this.messages = [];
  };

  Directive.prototype.addMessage = function (message) {
    var messages = this.messages;

    if (service.onlyUnique) {
      var msg, msgText;
      for (var i = messages.length - 1; i >= 0; i--) {
        msg = messages[i];
        msgText = $sce.getTrustedHtml(msg.text);
        if (message.text === msgText && message.severity === msg.severity && message.title === msg.title) {
          return null;
        }
      }
    }

    message.text = $sce.trustAsHtml(String(message.text));

    /**If message closes on timeout, add's promises array for
     timeouts to stop close. Also sets message.closeoutTimer to ttl / 1000
     **/
    if (message.ttl && message.ttl !== -1) {
      message.countdown = message.ttl / 1000;
      message.promises = [];
      message.close = false;
      message.countdownFunction = function () {
        if (message.countdown > 1) {
          message.countdown--;
          message.promises.push($timeout(message.countdownFunction, 1000));
        } else {
          message.countdown--;
        }
      };
    }

    messages.push(message);
    this.cutMessages();

    if (angular.isFunction(message.onopen)) {
      message.onopen();
    }

    if (message.ttl && message.ttl !== -1) {
      var self = this;
      //adds message timeout to promises and starts messages countdown function.
      message.promises.push($timeout(function () {
        self.deleteMessage(message);
      }, message.ttl));
      message.promises.push($timeout(message.countdownFunction, 1000));
    }

    return message;
  };

  Directive.prototype.deleteMessage = function (message) {
    var messages = this.messages,
        index = messages.indexOf(message);

    if (index > -1) {
      messages[index].close = true;
      messages.splice(index, 1);

      if (angular.isFunction(message.onclose)) {
        message.onclose();
      }
    }
  };

  this.directives = {};

  this.getDirective = function (referenceId) {
    referenceId = referenceId || 0;
    if (!this.directives[referenceId]) {
      this.directives[referenceId] = new Directive();
    }
    return this.directives[referenceId];
  };

  /**
   * Initialize a directive
   * We look for the previously created directive or create a new one
   * @param referenceId
   * @param limitMessages
   */
  this.initDirective = function (referenceId, limitMessages) {
    var directive = this.getDirective(referenceId);
    directive.limitMessages = limitMessages;
    directive.cutMessages();
    return directive;
  };

  this.getAllMessages = function (referenceId) {
    var directive = this.getDirective(referenceId);
    return directive.messages;
  };

  this.destroyAllMessages = function (referenceId) {
    var directive = this.getDirective(referenceId);
    return directive.destroyAllMessages();
  };

  this.addMessage = function (message) {
    var directive = this.getDirective(message.referenceId);
    return directive.addMessage(message);
  };

  this.deleteMessage = function (message) {
    var directive = this.getDirective(message.referenceId);
    return directive.deleteMessage(message);
  };

}]);

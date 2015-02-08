
    Polymer('settings-menu',{
      versions: [
        {sub:'5.1', api:'1.11.0'},
        {sub:'4.9', api:'1.10.2'},
        {sub:'4.8', api:'1.9.0'},
        {sub:'4.7', api:'1.8.0'}
      ],
      speeds: [
        96,
        128,
        192,
        256,
        320
      ],
      sizes: [
        20,
        30,
        40,
        50,
        60
      ],
      timer: 0,
      ready: function () {
        'use strict';
        this.post = [];
      },
      validate: function () {
        'use strict';

        /*
          here i use polymer built in selector to select all the inputs that are inside the div with the id of validate
        */
        var $d = this.$.validate.querySelectorAll('paper-input-decorator');
        Array.prototype.forEach.call($d, function(d) {
          d.isInvalid = !d.querySelector('input').validity.valid;
        });
      },
      submit: function () {
        'use strict';
        /*
          preforms the validation
        */
        this.validate();

        setTimeout(function () {
          var invalid1 = this.$.input1.classList.contains("invalid"),
            invalid2 = this.$.input2.classList.contains("invalid"),
            invalid3 = this.$.input3.classList.contains("invalid");


          if (invalid1 && invalid2 && this.post.version === undefined) {
            this.$.toast.text = "URL, Username & Version Required";
            this.$.toast.show();
          } else if (invalid1) {
            this.$.toast.text = "URL Required";
            this.$.toast.show();
          } else if (invalid2) {
            this.$.toast.text = "Username Required";
            this.$.toast.show();
          } else if (this.version === undefined) {
            this.$.toast.text = "Version Required";
            this.$.toast.show();
          }
          if (!invalid1 && !invalid2 && !invalid3 && this.post.version !== undefined && this.post.bitRate !== undefined) {
            console.log(this.post);
            this.$.ajax.go();
          }
        }.bind(this), 100);
      },
      hidePass: function (event, detail, sender) {
        'use strict';
        var type = this.$.password.type,
          button = this.$.showPass,
          timer = this.timer;

        if (type === "text") {
          this.$.password.type = "password";
          button.innerHTML = "Show Password";
          if (timer) {
            clearTimeout(timer);
            timer = 0;
          }
        } else {
          this.$.password.type = "text";
          button.innerHTML = "Hide Password";
          timer = setTimeout(function () {
            this.$.password.type = "password";
            button.innerHTML = "Show Password";
            timer = 0;
          }.bind(this), 15000);
        }
      },
      responseChanged: function () {
        var tmpl = document.querySelector("#tmpl"),
          wall = document.querySelector('#wall');
        'use strict';
        /*
          will display server response in a toast
        */
        if (!this.response) {
          this.$.toast.text = "Error Connecting to Server. Check Settings";
          this.$.toast.show();
        }
        if (this.response) {
          if (this.response['subsonic-response'].status === 'ok') {
            chrome.storage.sync.set({
              'url': this.post.url,
              'user': this.post.user,
              'pass': this.post.pass,
              'version': this.post.version,
              'bitRate': this.post.bitRate,
              'querySize': this.post.querySize
            });

            tmpl.url = this.post.url;

            tmpl.user = this.post.user;

            tmpl.pass = this.post.pass;

            tmpl.version = this.post.version;

            tmpl.bitRate = this.post.bitRate;

            tmpl.querySize = this.post.querySize;

            this.$.toast.text = "Settings Saved";
            this.$.toast.show();
          }
        }
      },
      errorChanged: function () {
        'use strict';
        /*
          will display any ajax error in a toast
        */
        if (this.error) {
          this.$.toast.text = this.error;
          this.$.toast.show();
        }
      },

      urlChanged: function () {
        this.post.url = this.url;
      },

      userChanged: function () {
        this.post.user = this.user;
      },

      passChanged: function () {
        this.post.pass = this.pass;
      },

      versionChanged: function () {
        this.post.version = this.version;
      },

      bitRateChanged: function () {
        this.post.bitRate = this.bitRate;
      },

      querySizeChanged: function () {
        this.post.querySize = this.querySize;
      }
    });
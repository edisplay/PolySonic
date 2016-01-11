/*global Polymer, console, document, Blob, window, Image, CoreAnimation, DownloadManager */
(function () {
  'use strict';
  Polymer('album-art', {

    imgURL: '',
    defaultImgURL: '../../../images/default-cover-art.png',
    albumSize: 0,
    showingDetails: false,
    isLoading: false,

    mouseIn: function (event, detail, sender) {
      sender.setZ(2);
    },

    mouseOut: function (event, detail, sender) {
      sender.setZ(1);
    },

    ready: function () {

      this.artist = this.artist || "Artist Name";
      this.album = this.album || "Album Title";
      this.app = document.getElementById("tmpl");
      this.app.colorThiefAlbum = this.app.colorThiefAlbum  || '#db4437';
      this.app.colorThiefAlbumOff = this.app.colorThiefAlbumOff  || 'white';
    },

    setImage: function (imgURL) {
      this.$.card.style.backgroundImage = "url('" + imgURL + "')";
      this.$.smallCover.style.backgroundImage = "url('" + imgURL + "')";
      this.$.topper.style.backgroundImage = "url('" + imgURL + "')";
      this.isLoading = false;
      this.imgURL = imgURL;
    },

    showDialog: function () {
      this.async(function () {
        this.app.dataLoading = false;
        this.app.tracker.sendAppView('Album Details');
        if (this.playlist[0].palette) {
          this.app.colorThiefAlbum = this.playlist[0].palette[0];
          this.app.colorThiefAlbumOff = this.playlist[0].palette[1];
        }
        this.$.detailsDialog.open();
        this.app.$.fab.state = 'mid';
        this.app.$.fab.ident = this.id;
      });
    },

    closeDialog: function () {
      this.app.tracker.sendAppView('Album Wall');
      this.$.detailsDialog.close();
      this.app.$.fab.state = 'off';
    },

    add2Playlist: function () {
      this.app.playlist = this.app.playlist.concat(this.playlist);
      this.app.dataLoading = false;
      if ('audio' in this.app.$.player && this.app.$.player.audio.paused) {
        this.app.playing = 0;
        this.app.setFabColor(this.playlist[0]);
      } else {
        if (this.app.playing === 0) {
          this.app.setFabColor(this.app.playlist[0]);
          this.app.$.player.playAudio(this.app.playlist[0]);
        } else {
          this.app.playing = 0;
        }
      }
      this.$.globals.makeToast(this.$.globals.texts.added2Queue);
    },

    downloadAlbum: function (event, detail, sender) {

      var manager = new DownloadManager();
      var animation = this.$.globals.attachAnimation(sender);
      animation.play();
      this.doQuery().then(function () {
        this.app.$.downloads.appendChild(manager);
        this.app.isDownloading = true;
        animation.cancel();
        manager.downloadAlbum({
          id: this.albumID,
          artist: this.artist,
          album: this.album,
          size: this.albumSize
        }, function () {
          console.log('Download Finished: ' + this.artist + ' - ' + this.album);
        }.bind(this));
      }.bind(this));
    },

    doTrackDownload: function (event, detail, sender) {

      var manager = new DownloadManager();
      var animation = this.$.globals.attachAnimation(sender);
      animation.play();
      this.doQuery().then(function () {
        this.app.$.downloads.appendChild(manager);
        this.app.isDownloading = true;
        animation.cancel();
        manager.downloadTrack(sender.attributes.ident.value, function () {
          console.log('Track Download Finished');
        }.bind(this));
      }.bind(this));
    },

    playSingle: function (event, detail, sender) {

      this.$.detailsDialog.close();
      this.app.playlist = [
        {
          id: sender.attributes.ident.value,
          artist: sender.attributes.artist.value,
          title: sender.attributes.trackTitle.value,
          duration: sender.attributes.duration.value,
          cover: this.imgURL,
          palette: this.palette,
          disk: 0,
          track: 0
        }
      ];
      if (sender.attributes.bookmark) {
        this.app.playlist[0].bookmarkPosition = sender.attributes.bookmark.value;
      }
      this.app.setFabColor(this.app.playlist[0]);
      if (this.app.playing === 0) {
        this.app.$.player.playAudio(this.app.playlist[0]);
      } else {
        this.app.playing = 0;
      }
      this.app.$.fab.state = 'off';
    },

    addSingle2Playlist: function (event, detail, sender) {

      this.app.playlist.push({
        id: sender.attributes.ident.value,
        artist: sender.attributes.artist.value,
        title: sender.attributes.trackTitle.value,
        duration: sender.attributes.duration.value,
        cover: this.imgURL,
        palette: this.palette,
        disk: 0,
        track: 0
      });
      if (this.app.$.player.audio.paused) {
        this.app.setFabColor(this.app.playlist[0]);
        if (this.app.playing === 0) {
          this.app.$.player.playAudio(this.playlist[0]);
        } else {
          this.app.playing = 0;
        }
      }
      this.$.globals.makeToast(this.$.globals.texts.added2Queue);
    },

    chooseOption: function () {

      if (this.bookmarkIndex !== undefined) {
        this.app.dataLoading = false;
        this.bookmarkTime = this.$.globals.secondsToMins(this.playlist[this.bookmarkIndex].bookmarkPosition / 1000);
        this.$.albumPlaybackConfirm.open();
        if (this.$.detailsDialog.opened) {
          this.$.detailsDialog.close();
        }
      } else {
        this.playAlbum();
      }
    },

    playFromBookmark: function () {

      this.shortPlaylist = this.playlist.splice(this.bookmarkIndex);
      this.app.dataLoading = false;
      this.$.detailsDialog.close();
      this.app.$.player.getImageForPlayer(this.imgURL, function () {
        this.app.playlist = this.shortPlaylist;
        this.app.setFabColor(this.app.playlist[0]);
        if (this.app.playing === 0) {
          this.app.$.player.playAudio(this.app.playlist[0]);
        } else {
          this.app.playing = 0;
        }
      }.bind(this));
    },

    playAlbum: function () {

      var pLength = this.playlist.length;
      for (var i = 0; i < pLength; i++) {
        if (this.playlist[i].bookmarkPosition) {
          delete this.playlist[i].bookmarkPosition;
        }
      }
      this.app.dataLoading = false;
      this.$.detailsDialog.close();
      this.app.playlist = this.playlist;
      this.app.setFabColor(this.playlist[0]);
      if (this.app.playing === 0) {
        this.app.$.player.playAudio(this.playlist[0]);
      } else {
        this.app.playing = 0;
      }
    },

    addFavorite: function (event, detail, sender) {

      var url = this.$.globals.buildUrl('star', {
        albumId: sender.attributes.ident.value
      });
      var animation = this.$.globals.attachAnimation(sender);
      animation.target = sender;
      animation.play();
      this.$.globals.doXhr(url, 'json').then(function (e) {
        if (e.target.response['subsonic-response'].status === 'ok') {
          this.isFavorite = true;
          animation.cancel();
        }
      }.bind(this));
    },

    removeFavorite: function (event, detail, sender) {

      var url = this.$.globals.buildUrl('unstar', {
        albumId: sender.attributes.ident.value
      });
      var animation = this.$.globals.attachAnimation(sender);
      animation.play();
      this.$.globals.doXhr(url, 'json').then(function (e) {
        if (e.target.response['subsonic-response'].status === 'ok') {
          this.isFavorite = false;
          animation.cancel();
        }
      }.bind(this));
    },

    doPlayback: function () {

      this.app.dataLoading = true;
      this.doQuery().then(this.chooseOption.bind(this));
    },

    showDetails: function () {

      this.showingDetails = true;
      this.app.dataLoading = true;
      this.doQuery().then(this.showDialog.bind(this));
    },

    doAdd2Playlist: function () {

      this.app.dataLoading = true;
      this.doQuery().then(this.add2Playlist.bind(this));
    },

    processJSON: function (e) {

      return new Promise(function (resolve, reject) {
        this.playlist.length = 0;
        this.albumID = e.target.response['subsonic-response'].album.song[0].parent;
        var tracks = e.target.response['subsonic-response'].album.song;
        /* sort tracks by diskNumber thanks Joe Shelby */
        tracks.sort(function sorting(a, b) {
          var da = a.discNumber || 0, db = b.discNumber || 0,
            ta = a.track || 0, tb = b.track || 0;
          if (da === db) {
            return ta - tb;
          } else {
            return da - db;
          }
        });
        var length = tracks.length;
        for (var i = 0; i < length; i++) {
          this.albumSize = this.albumSize + tracks[i].size;
          this.playlist.push({
            id: tracks[i].id,
            artist: tracks[i].artist,
            title: tracks[i].title,
            duration: this.$.globals.secondsToMins(tracks[i].duration),
            cover: this.imgURL,
            bookmarkPosition: tracks[i].bookmarkPosition,
            palette: this.palette,
            disk: tracks[i].diskNumber,
            track: tracks[i].track
          });
          if (tracks[i].bookmarkPosition && this.bookmarkIndex === undefined) {
            this.bookmarkIndex = i;
          }
          if (i === length - 1) {
            this.async(resolve);
          }
        }
      }.bind(this));
    },

    doQuery: function () {

      return new Promise(function (resolve, reject) {
        this.$.globals.getDbItem("al-" + this.item + '-palette').then(function (e) {
          this.palette = e.target.result;
          var url = this.$.globals.buildUrl('getAlbum', {
            id: this.item
          });
          this.$.globals.doXhr(url, 'json').then(this.processJSON.bind(this)).then(resolve);
        }.bind(this));
      }.bind(this));
    },

    _updateItem: function () {
      this.bookmarkIndex = undefined;
      if (this.item && !this.app.scrolling) {
        this.playlist = [];
        this.albumSize = 0;
        this.isLoading = true;
        this.$.globals.fetchImage("al-" + this.item).then(this.setImage.bind(this));
      } else {
        this.async(this.itemChanged, null, 50);
      }
    },

    itemChanged: function () {

      this.async(this._updateItem);
    },

    moreLikeCallback: function () {
      if (this.app.$.player.audio.paused) {
        this.app.$.player.getImageForPlayer(this.app.playlist[0].cover, function () {
          this.app.playing = 0;
          this.app.setFabColor(this.app.playlist[0]);
          this.app.$.player.playAudio(this.app.playlist[0]);
          this.app.dataLoading = false;
        }.bind(this));
      }
    },

    moreLike: function (event, detail, sender) {

      var id = sender.attributes.ident.value;
      this.$.detailsDialog.close();
      this.app.$.fab.state = 'off';
      this.app.dataLoading = true;
      var url = this.$.globals.buildUrl('getSimilarSongs', {
        count: 50,
        id: id
      });
      this.$.globals.doXhr(url, 'json').then(function (e) {
        var response = e.target.response['subsonic-response'].similarSongs.song;
        if (response) {
          this.app.$.player.audio.pause();
          this.app.playlist.length = 0;
          var rlength = response.length;
          for (var i = 0; i < rlength; i++) {
            var obj = {
              id: response[i].id,
              artist: response[i].artist,
              title: response[i].title,
              duration: this.$.globals.secondsToMins(response[i].duration)
            },
            artId = 'al-' + response[i].albumId;
            this.$.globals.getDbItem(artId, function (ev) {
              this.moreCallback(ev,obj,artId);
            }.bind(this));
          }
        } else {
          this.app.dataLoading = false;
          this.$.globals.makeToast(this.$.globals.texts.noResults);
        }
      }.bind(this));
    },

    moreCallback: function (artEvent, obj, artId) {
      if (artEvent.target.result) {
        obj.cover = window.URL.createObjectURL(artEvent.target.result);
        this.$.globals.getDbItem(artId + '-palette', function (paletteEvent) {
          obj.palette = paletteEvent.target.result;
          this.app.playlist.push(obj);
          this.moreLikeCallback();
        }.bind(this));
      } else {
        this.$.globals.getImageFile(
          this.$.globals.buildUrl('getCoverArt', {
            size: 550,
            id: artId
          }), artId, function (xhrEvent) {
          obj.cover = window.URL.createObjectURL(xhrEvent.target.result);
          this.$.globals.stealColor(imgURL, artId, function (colorArray) {
            obj.palette = colorArray;
            this.app.playlist.push(obj);
            this.moreLikeCallback();
          }.bind(this));
        }.bind(this));
      }
    },

    conBookDel: function (event, detail, sender) {
      this.delID = sender.attributes.ident.value;
      this.$.bookmarkConfirm.open();
    },

    deleteBookmark: function (event) {
      var url = this.$.globals.buildUrl('deleteBookmark', {
        id: this.delID
      });
      this.$.globals.doXhr(url, 'json').then(function (e) {
        if (e.target.response['subsonic-response'].status === 'ok') {
          this.doQuery();
        } else {
          this.$.globals.makeToast(e.target.response['subsonic-response'].error.message);
        }
      });
    },

    /**
     * choose to playback from bookmark or start of track
     */
    playChoice: function (event, detail, sender) {
      if (this.$.detailsDialog.opened) {
        this.$.detailsDialog.close();
      }
      this.$.playbackConfirm.open();
      this.bookMark = {
        id: sender.attributes.ident.value,
        artist: sender.attributes.artist.value,
        title: sender.attributes.trackTitle.value,
        duration: sender.attributes.duration.value,
        bookmarkPosition: sender.attributes.bookmark.value,
        cover: sender.attributes.cover.value
      };
      this.bookmarkTime = this.$.globals.secondsToMins(sender.attributes.bookmark.value / 1000);
    }
  });
})();

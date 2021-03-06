const {URL} = require('url');


module.exports = () => {
  const _cookies = [];

  return {
    fakeApi(browser) {
      const _cookieDefaults = {
        firstPartyDomain: '',
        hostOnly: true,
        httpOnly: false,
        secure: false,
        session: true,
        storeId: 'firefox-default',
        value: ''
      };
      const _cookieFilter = (cookie, filter) => Object.keys(filter).every(key => {
        if (key === 'url') {
          const parsedUrl = new URL(filter[key]);
          if (!parsedUrl) {
            throw new Error('Invalid url');
          }
          return cookie.domain === parsedUrl.hostname &&
                 cookie.path === parsedUrl.pathname;
        }
        return cookie[key] === filter[key];
      });
      const cookies = {
        async set(details) {
          const query = Object.assign({}, details);
          delete query.value;
          const existingCookies = cookies.getAll(query);
          if (existingCookies.length > 1) {
            throw new Error('Two cookies for the given details exist already, thats bad');
          }

          const parsedUrl = new URL(details.url);
          if (!parsedUrl) {
            throw new Error('Invalid url');
          }
          const newCookie = Object.assign({}, _cookieDefaults, details, {
            domain: parsedUrl.hostname,
            path: parsedUrl.pathname
          });
          delete newCookie.url;

          if (!existingCookies.length) {
            _cookies.push(newCookie);
          } else {
            const existingCookie = existingCookies[0];
            const cookieIndex = _cookies.findIndex(cookie => {
              return _cookieFilter(cookie, existingCookie);
            });
            _cookies[cookieIndex] = newCookie;
          }

          return newCookie;
        },

        async remove(details) {
          const cookieIndex = _cookies.findIndex(cookie =>
            _cookieFilter(cookie, details)
          );
          if (cookieIndex === -1) {
            return null;
          }
          const cookie = Object.assign({}, _cookies[cookieIndex]);
          _cookies.splice(cookieIndex, 1);
          return cookie;
        },

        async get(query) {
          const cookies = _cookies.filter(cookie =>
            _cookieFilter(cookie, query)
          );
          // If more than one cookie with the same name exists for a given URL,
          // the one with the longest path will be returned. For cookies with the
          // same path length, the cookie with the earliest creation time will be
          // returned. If no matching cookie could be found, null is returned.
          if (!cookies.length) {
            return null;
          }
          return cookies[0];
        },

        async getAll(query) {
          return _cookies.filter(cookie =>
            _cookieFilter(cookie, query)
          );
        },

        async getAllCookieStores() {
          return [{
            id: 'firefox-default',
            tabIds: []
          }];
        }
      };

      browser.cookies.set.callsFake(cookies.set);
      browser.cookies._set = cookies.set;

      browser.cookies.get.callsFake(cookies.get);
      browser.cookies._get = cookies.get;

      browser.cookies.getAll.callsFake(cookies.getAll);
      browser.cookies._getAll = cookies.getAll;

      browser.cookies.getAllCookieStores.callsFake(cookies.getAllCookieStores);
      browser.cookies._getAllCookieStores = cookies.getAllCookieStores;

      browser.cookies.remove.callsFake(cookies.remove);
      browser.cookies._remove = cookies.remove;
    }
  };
};
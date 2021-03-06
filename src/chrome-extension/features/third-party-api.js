/**
 * third party api
 * you can do things like:
 * 1. sync thirdparty contacts to ringcentral contact list
 * 2. when calling or call inbound, show caller/callee info panel
 * 3. sync call log to third party system
 *
 * document about third party features: https://github.com/ringcentral/ringcentral-embeddable/blob/master/docs/third-party-service-in-widget.md
 * finish all todos in
 *
 * src/chrome-extension/features/activities.js
 * src/chrome-extension/features/auth.js
 * src/chrome-extension/features/call-log-sync.js
 * src/chrome-extension/features/contacts.js
 * to make all third party feature work
 *
 */

import {thirdPartyConfigs} from '../common/app-config'
import {
  showAuthBtn,
  unAuth,
  renderAuthButton,
  notifyRCAuthed
} from './auth'
import * as ls from '../common/ls'
import _ from 'lodash'
import {
  findMatchContacts,
  searchContacts,
  getContacts,
  hideContactInfoPanel,
  showContactInfoPanel,
  renderConfirmGetContactsButton
} from './contacts'
import {showActivityDetail, getActivities} from './activities'
import {syncCallLogToThirdParty} from './call-log-sync'
import {
  sendMsgToBackground
} from '../common/helpers'
import {getUserId} from '../config'

let {
  serviceName
} = thirdPartyConfigs

const lsKeys = {
  apiKeyLSKey: 'rcapikey'
}

window.rc = {
  local: {
    apiKey: null
  },
  postMessage: data => {
    sendMsgToBackground({
      to: 'standalone',
      data
    })
  },
  currentUserId: '',
  cacheKey: 'contacts' + '_' + '',
  updateToken: async function (newToken, type = 'apiKey') {
    window.rc.local[type] = newToken
    let key = lsKeys[`${type}LSKey`]
    await ls.set(key, newToken)
  }

}



/**
 * handle ringcentral widgets contacts list events
 * @param {Event} e
 */
async function handleRCEvents(e) {
  let {data} = e
  // console.log('======data======')
  // console.log(data, data.type, data.path)
  // console.log('======data======')
  if (!data) {
    return
  }
  let {type, loggedIn, path, call} = data
  if (type === 'rc-adapter-pushAdapterState') {
    return initRCEvent()
  }
  if (type ===  'rc-login-status-notify') {
    console.log(loggedIn, 'loggedIn')
  }
  if (
    type === 'rc-route-changed-notify' &&
    path === '/contacts' &&
    !window.rc.local.apiKey
  ) {
    showAuthBtn()
  } else if (
    type === 'rc-active-call-notify' ||
    type === 'rc-call-start-notify'
  ) {
    showContactInfoPanel(call)
  } else if ('rc-call-end-notify' === type) {
    hideContactInfoPanel()
  }
  if (type !== 'rc-post-message-request') {
    return
  }

  if (data.path === '/authorize') {
    if (window.rc.local.apiKey) {
      unAuth()
    } else {
      showAuthBtn()
    }
    window.rc.postMessage({
      type: 'rc-post-message-response',
      responseId: data.requestId,
      response: { data: 'ok' }
    }, '*')
  }
  else if (path === '/contacts') {
    let contacts = await getContacts()
    window.rc.postMessage({
      type: 'rc-post-message-response',
      responseId: data.requestId,
      response: {
        data: contacts,
        nextPage: null
      }
    }, '*')
  }
  else if (path === '/contacts/search') {
    let contacts = await getContacts()
    let keyword = _.get(data, 'body.searchString')
    if (keyword) {
      contacts = searchContacts(contacts, keyword)
    }
    window.rc.postMessage({
      type: 'rc-post-message-response',
      responseId: data.requestId,
      response: {
        data: contacts
      }
    }, '*')
  }
  else if (path === '/contacts/match') {
    let contacts = await getContacts()
    let phoneNumbers = _.get(data, 'body.phoneNumbers') || []
    let res = findMatchContacts(contacts, phoneNumbers)
    window.rc.postMessage({
      type: 'rc-post-message-response',
      responseId: data.requestId,
      response: {
        data: res
      }
    }, '*')
  }
  else if (path === '/callLogger') {
    // add your codes here to log call to your service
    syncCallLogToThirdParty(data.body)
    // response to widget
    window.rc.postMessage({
      type: 'rc-post-message-response',
      responseId: data.requestId,
      response: { data: 'ok' }
    }, '*')
  }
  else if (path === '/activities') {
    const activities = await getActivities(data.body)
    window.rc.postMessage({
      type: 'rc-post-message-response',
      responseId: data.requestId,
      response: { data: activities }
    }, '*')
  }
  else if (path === '/activity') {
    // response to widget
    showActivityDetail(data.body)
    window.rc.postMessage({
      type: 'rc-post-message-response',
      responseId: data.requestId,
      response: { data: 'ok' }
    }, '*')
  }
}

function initRCEvent() {
  //register service to rc-widgets
  let data = {
    type: 'rc-adapter-register-third-party-service',
    service: {
      name: serviceName,
      contactsPath: '/contacts',
      contactSearchPath: '/contacts/search',
      contactMatchPath: '/contacts/match',
      authorizationPath: '/authorize',
      authorizedTitle: 'Unauthorize',
      unauthorizedTitle: 'Authorize',
      callLoggerPath: '/callLogger',
      callLoggerTitle: `Log to ${serviceName}`,
      activitiesPath: '/activities',
      activityPath: '/activity',
      authorized: false
    }
  }
  window.rc.postMessage(data)
}

export default async function initThirdPartyApi () {

  // init
  let userId = getUserId()
  window.rc.currentUserId = userId
  window.rc.cacheKey = 'contacts' + '_' + userId,
  window.addEventListener('message', handleRCEvents)

  // try to get api key from chrome storage
  let apiKey = await ls.get(lsKeys.apiKeyLSKey) || ''
  window.rc.local = {
    apiKey
  }

  //get the html ready
  renderAuthButton()
  renderConfirmGetContactsButton()

  if (window.rc.local.apiKey) {
    notifyRCAuthed()
  }
}

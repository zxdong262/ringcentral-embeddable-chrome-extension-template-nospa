/**
 * third party contacts related feature
 */

import _ from 'lodash'
import {setCache, getCache} from '../common/cache'
import {
  showAuthBtn
} from './auth'
import {
  popup,
  createElementFromHTML,
  formatPhone
} from '../common/helpers'
import {thirdPartyConfigs} from '../common/app-config'

let {
  serviceName
} = thirdPartyConfigs
//let syncHanlder = null

function hideSyncTip() {
  document
    .querySelector('.rc-sync-contact-button-wrap')
    .classList.add('rc-hide-to-side')
}

// const showSyncTip = _.debounce(function() {
//   document
//     .querySelector('.rc-sync-contact-button-wrap')
//     .classList.remove('rc-hide-to-side')
//   clearTimeout(syncHanlder)
//   syncHanlder = setTimeout(hideSyncTip, 15000)
// }, 10000, {
//   leading: true
// })

/**
 * click contact info panel event handler
 * @param {Event} e
 */
function onClickContactPanel (e) {
  let {target} = e
  let {classList} = target
  if (classList.contains('rc-close-contact')) {
    document
      .querySelector('.rc-contact-panel')
      .classList.add('rc-hide-to-side')
  }
}

/**
 * conatct info iframe loaded event
 */
function onloadIframe () {
  let dom = document
    .querySelector('.rc-contact-panel')
  dom && dom.classList.add('rc-contact-panel-loaded')
}

/**
 * search contacts by number match
 * @param {array} contacts
 * @param {string} keyword
 */
export function findMatchContacts(contacts = [], numbers) {
  let {formatedNumbers, formatNumbersMap} = numbers.reduce((prev, n) => {
    let nn = formatPhone(n)
    prev.formatedNumbers.push(nn)
    prev.formatNumbersMap[nn] = n
    return prev
  }, {
    formatedNumbers: [],
    formatNumbersMap: {}
  })
  let res = contacts.filter(contact => {
    let {
      phoneNumbers
    } = contact
    return _.find(phoneNumbers, n => {
      return formatedNumbers
        .includes(
          formatPhone(n.phoneNumber)
        )
    })
  })
  return res.reduce((prev, it) => {
    let phone = _.find(it.phoneNumbers, n => {
      return formatedNumbers.includes(
        formatPhone(n.phoneNumber)
      )
    })
    let num = phone.phoneNumber
    let key = formatNumbersMap[
      formatPhone(num)
    ]
    if (!prev[key]) {
      prev[key] = []
    }
    let res = {
      id: it.id, // id to identify third party contact
      type: serviceName, // need to same as service name
      name: it.name,
      phoneNumbers: it.phoneNumbers
    }
    prev[key].push(res)
    return prev
  }, {})
}


/**
 * search contacts by keyword
 * @param {array} contacts
 * @param {string} keyword
 */
export function searchContacts(contacts = [], keyword) {
  return contacts.filter(contact => {
    let {
      name,
      phoneNumbers
    } = contact
    return name.includes(keyword) ||
      _.find(phoneNumbers, n => {
        return n.phoneNumber.includes(keyword)
      })
  })
}

/**
 * get contact lists function
 * todo: this function need you find out how to do it
 * you may check the CRM site to find the right api to do it
 * or CRM site supply with special api for it
 */
export const getContacts = _.debounce(async function getContacts() {
  if (!window.rc.rcLogined) {
    return []
  }
  if (!window.rc.local.apiKey) {
    showAuthBtn()
    return []
  }
  let cached = await getCache(window.rc.cacheKey)
  if (cached) {
    console.log('use cache')
    return cached
  }
  // do get the conatcts list
  let final = [{
    id: '123456', // id to identify third party contact
    name: 'TestService Name', // contact name
    type: 'TestService', // need to same as service name
    phoneNumbers: [{
      phoneNumber: '+1234567890',
      phoneType: 'directPhone'
    }],
    emails: ['test@email.com']
  }]
  await setCache(window.rc.cacheKey, final)
  return final
}, 100, {
  leading: true
})

export function hideContactInfoPanel() {
  let dom = document
    .querySelector('.rc-contact-panel')
  dom && dom.classList.add('rc-hide-to-side')
}

/**
 * show caller/callee info
 * todo: you need find out right url for conact to show it when calling
 * you may check the CRM site to find the right api to do it
 * @param {Object} call
 */
export async function showContactInfoPanel(call) {
  if (
    !call.telephonyStatus ||
    call.telephonyStatus === 'CallConnected'
  ) {
    return
  }
  if (call.telephonyStatus === 'NoCall') {
    return hideContactInfoPanel()
  }
  let isInbound = call.direction === 'Inbound'
  let phone = isInbound
    ? _.get(
      call,
      'from.phoneNumber'
    )
    : _.get(call, 'to.phoneNumber')
  if (!phone) {
    return
  }
  phone = formatPhone(phone)
  let contacts = await getContacts()
  let contact = _.find(contacts, c => {
    return _.find(c.phoneNumbers, p => {
      return formatPhone(p.phoneNumber) === phone
    })
  })
  if (!contact) {
    return
  }
  let {host, protocol} = location
  let url = `${protocol}//${host}/contacts/${contact.id}`
  let elem = createElementFromHTML(
    `
    <div class="animate rc-contact-panel" draggable="false">
      <div class="rc-close-box">
        <div class="rc-fix rc-pd2x">
          <span class="rc-fleft">Contact</span>
          <span class="rc-fright">
            <span class="rc-close-contact">&times;</span>
          </span>
        </div>
      </div>
      <div class="rc-tp-contact-frame-box">
        <iframe class="rc-tp-contact-frame" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" allow="microphone" src="${url}" id="rc-tp-contact-frame">
        </iframe>
      </div>
      <div class="rc-loading">loading...</div>
    </div>
    `
  )
  elem.onclick = onClickContactPanel
  elem.querySelector('iframe').onload = onloadIframe
  let old = document
    .querySelector('.rc-contact-panel')
  old && old.remove()

  document.body.appendChild(elem)
  popup()
}

function onClickSyncPanel(e) {
  let {target} = e
  let {classList}= target
  if (target.classList.contains('rc-do-sync-contact')) {
    getContacts(true)
    hideSyncTip()
  } else if (classList.contains('rc-no-sync-contact')) {
    hideSyncTip()
  }
}

/**
 * get contacts may take a while,
 * user can decide sync or not
 */
export function renderConfirmGetContactsButton() {
  let btn = createElementFromHTML(
    `
      <div
        class="rc-sync-contact-button-wrap animate rc-hide-to-side"
        title=""
      >
        <div class="rc-sync-tip animate">
        After sync, you can access lastest ${serviceName} contacts from RingCentral phone's contacts list. you can skip this by click close button.
        </div>
        <span class="rc-iblock">Sync contacts?</span>
        </span>
        <span class="rc-do-sync-contact rc-iblock pointer">Yes</span>
        <span class="rc-no-sync-contact rc-iblock pointer">No</span>
      </div>
    `
  )
  btn.onclick = onClickSyncPanel
  if (
    !document.querySelector('.rc-sync-contact-button-wrap')
  ) {
    document.body.appendChild(btn)
  }
}

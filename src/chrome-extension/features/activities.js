/**
 * third party activies related feature
 */

import extLinkSvg from '../common/link-external.svg'
import {
  notify
} from '../common/helpers'

/**
 * todo:
 * when user click conatct activity item, show activity detail
 * @param {object} body
 */
export function showActivityDetail(body) {
  let {activity = {}} = body
  let {
    subject,
    url
  } = activity
  let msg = `
    <div>
      <div class="rc-pd1b">
        <a href="${url}">
          <b>
            subject: ${subject}
            <img width=16 height=16 src="${extLinkSvg}" />
          </b>
        </a>
      </div>
    </div>
  `
  notify(msg, 'info', 8000)
}

/**
 * todo
 * method to get contact activities from CRM site
 * check CRM site to find out how to do this
 * @param {*} body
 */
export async function getActivities(body) {
  console.log(body)
  return []
  /* should return array:
  [
    {
      id: '123',
      subject: 'Title',
      time: 1528854702472
    }
  ]
  */
}

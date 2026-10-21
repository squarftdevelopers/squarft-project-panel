import { router } from 'expo-router';
import { getProjectPanelNotificationEvent, interpolateNotificationTemplate } from './projectPanelNotificationCatalog';
import { PUSH_NOTIFICATION_URL_SCHEME } from './pushNotificationConfig';

export const getRouteFromNotificationData = (input = {}) => {
  const data = { ...(input.metadata || {}), ...input };
  const eventKey = data.eventKey || data.event_key || data.event || data.type || '';
  const definition = getProjectPanelNotificationEvent(eventKey);
  let route = data.route || data.deepLink || data.url || data.href || definition?.sheetRoute || '';
  route = interpolateNotificationTemplate(route, data);
  if (route.startsWith(`${PUSH_NOTIFICATION_URL_SCHEME}://`)) route = `/${route.split('://')[1].replace(/^\//,'')}`;
  if (/KYC/.test(eventKey) || route.startsWith('/kyc')) return '/(screens)/kyc';
  const projectId = data.project_id || data.projectId || route.match(/^\/projects\/([^/?]+)/)?.[1];
  const dealId = data.deal_id || data.dealId || route.match(/\/deals\/([^/?]+)/)?.[1];
  if (dealId && !String(dealId).includes('{{')) return { pathname: '/(screens)/project-deal', params: { id: dealId } };
  if (projectId && !String(projectId).includes('{{')) {
    if (/FORM_INCOMPLETE|PROJECT_REJECTED/.test(eventKey) || /\/form\/|\/correction/.test(route)) {
      return { pathname: '/(tabs)/add-project', params: { projectId, step: String(data.rejected_step || data.rejectedStep || data.current_step || data.currentStep || route.match(/\/step\/(\d)/)?.[1] || 1) } };
    }
    return { pathname: '/(tabs)/home', params: { projectId, tab: /PAYMENT|DEAL/.test(eventKey) || /payment|deals/.test(route) ? 'Deals' : /UNIT|inventory/.test(eventKey + route) ? 'Inventory' : 'Overview' } };
  }
  if (['/(tabs)/home','/(tabs)/add-project','/(screens)/notifications','/(screens)/kyc'].includes(route)) return route;
  return '/(screens)/notifications';
};
export const routeNotificationResponse = (response) => router.push(getRouteFromNotificationData(response?.notification?.request?.content?.data || {}));
export const buildRouteForProjectPanelEvent = (eventKey,data={}) => getRouteFromNotificationData({...data,eventKey});

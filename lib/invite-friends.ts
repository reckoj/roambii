import { Share, Platform } from 'react-native';

interface AppUrls {
  ios: string;
  android: string;
  default: string;
}

const APP_URLS: AppUrls = {
  ios: 'https://apps.apple.com/your-app-store-link',
  android: 'https://play.google.com/store/apps/your-play-store-link',
  default: 'https://my-valentine-nancy.netlify.app/yay.html'
};

export const InviteFriends = async (): Promise<boolean> => {
  const shareMessage = `Hey! Check out this amazing app!\n\n` +
    `Download it here: ${Platform.select({
      ios: APP_URLS.ios,
      android: APP_URLS.android,
      default: APP_URLS.default
    })}`;

  try {
    const result = await Share.share({
      message: shareMessage,
      title: 'Invite Friends to Download Our App'
    });

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Error sharing:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};
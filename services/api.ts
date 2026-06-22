import { CONFIG } from "./../constants/config";
/**
 * Sentinel Cam — API Service
 *
 * All functions are currently mocked.
 * Replace the bodies with real fetch / FileSystem.uploadAsync calls once the backend is ready.
 */

export interface ChunkUploadPayload {
  localUri: string;
  accessToken: string;
}

export async function uploadChunk(payload: ChunkUploadPayload): Promise<void> {
  const formData = new FormData();
  formData.append("dashcamFootage", {
    uri: payload.localUri,
    type: "video/mp4",
    name: `${Date.now()}.mp4`,
  } as any);


  const response = await fetch(
    `${CONFIG.API_BASE_URL}/api/dashcam/upload-Footage`,
    {
      method: "POST",
      headers: {
        token: payload.accessToken,
      },
      body: formData,
    },
  );
  const data = await response.json();
  console.log("dashcam footage response", data);

  return data;
}

export async function camLogin(nationalId: string) {
  const response = await fetch(
    `${CONFIG.API_BASE_URL}/api/auth/dashcam/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nationalId }),
    },
  );

  const data = await response.json();

  return data;
}
export async function updatePushNotificationKeyService(
  expoPushToken: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(`${CONFIG.API_BASE_URL}/api/dashcam/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: accessToken,
    },
    body: JSON.stringify({ sentinelCamKey: expoPushToken }),
  });

  const data = await response.json();

  return data;
}
export async function disconnect(accessToken: string) {
  const response= await fetch(`${CONFIG.API_BASE_URL}/api/dashcam/disconnect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: accessToken,
    },
  });
  const data =await response.json();
  console.log("disconnect response", data);

  

}
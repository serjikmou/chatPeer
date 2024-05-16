import Peer, { DataConnection } from "peerjs";
import { message } from "antd";

export enum DataType {
  FILE = "FILE",
  OTHER = "OTHER",
}
export interface Data {
  dataType: DataType;
  file?: Blob;
  fileName?: string;
  fileType?: string;
  message?: string;
}

let peer: Peer | undefined;
let connectionMap: Map<string, DataConnection> = new Map<
  string,
  DataConnection
>();

export const PeerConnection = {
  getPeer: () => peer,
  startPeerSession: () =>
    new Promise<string>((resolve, reject) => {
      try {
        peer = new Peer();
        peer
          .on("open", (id) => {
            console.log("My ID: " + id);
            resolve(id);
          })
          .on("error", (err) => {
            console.log(err);
            message.error(err.message);
          });
      } catch (err) {
        console.log(err);
        reject(err);
      }
    }),
  closePeerSession: () =>
    new Promise<void>((resolve, reject) => {
      try {
        if (peer) {
          peer.destroy();
          peer = undefined;
        }
        resolve();
      } catch (err) {
        console.log(err);
        reject(err);
      }
    }),
  connectPeer: (id: string) =>
    new Promise<void>((resolve, reject) => {
      if (!peer) {
        reject(new Error("Peer doesn't start yet"));
        return;
      }
      if (connectionMap.has(id)) {
        reject(new Error("Connection existed"));
        return;
      }
      try {
        let conn = peer.connect(id, { reliable: true });
        if (!conn) {
          reject(new Error("Connection can't be established"));
        } else {
          conn
            .on("open", function () {
              console.log("Connect to: " + id);
              connectionMap.set(id, conn);
              resolve();
            })
            .on("error", function (err) {
              console.log(err);
              reject(err);
            });
        }
      } catch (err) {
        reject(err);
      }
    }),
  onIncomingConnection: (callback: (conn: DataConnection) => void) => {
    peer?.on("connection", function (conn) {
      console.log("Incoming connection: " + conn.peer);
      connectionMap.set(conn.peer, conn);
      callback(conn);
    });
  },
  onConnectionDisconnected: (id: string, callback: () => void) => {
    if (!peer) {
      throw new Error("Peer doesn't start yet");
    }
    if (!connectionMap.has(id)) {
      throw new Error("Connection didn't exist");
    }
    let conn = connectionMap.get(id);
    if (conn) {
      conn.on("close", function () {
        console.log("Connection closed: " + id);
        connectionMap.delete(id);
        callback();
      });
    }
  },
  sendConnection: (id: string, data: Data): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!connectionMap.has(id)) {
        reject(new Error("Connection didn't exist"));
      }
      try {
        let conn = connectionMap.get(id);
        if (conn) {
          conn.send(data);
        }
      } catch (err) {
        reject(err);
      }
      resolve();
    }),
  sendText: (
    id: string,
    text: string,
    callback: (t: string) => void
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!connectionMap.has(id)) {
        reject(new Error("Connection didn't exist"));
      }
      try {
        let conn = connectionMap.get(id);
        if (conn) {
          conn.send(text);
          callback(text);
        }
      } catch (err) {
        reject(err);
      }
      resolve();
    }),
  sendCall: (
    id: string,
    localStream: MediaStream,
    callback: (conn: MediaStream) => void
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!connectionMap.has(id)) {
        reject(new Error("Connection didn't exist"));
      }
      try {
        let conn = connectionMap.get(id);
        if (conn) {
          const peerCall = peer?.call(id, localStream);
          peerCall?.on("stream", (remoteStream) => {
            callback(remoteStream);
          });
        }
      } catch (err) {
        reject(err);
      }
      resolve();
    }),
  onConnectionReceiveData: (
    id: string,
    callback: (data: string | Data) => void
  ) => {
    if (!peer) {
      throw new Error("Peer doesn't start yet");
    }
    if (!connectionMap.has(id)) {
      throw new Error("Connection doesn't exist");
    }
    let conn = connectionMap.get(id);
    if (conn) {
      conn.on("data", function (receivedData) {
        console.log("Receiving data from " + id);

        if (typeof receivedData === "string") {
          callback(receivedData);
        } else {
          let data = receivedData as Data;
          callback(data);
        }
      });
    }
  },
  onConnectionCall: (
    callback: (local: MediaStream, remote: MediaStream) => void
  ) => {
    if (!peer) {
      throw new Error("Peer doesn't start yet");
    }
    peer.on("call", (call) => {
      const getUserMedia = navigator.mediaDevices.getUserMedia;

      getUserMedia({ video: false, audio: true })
        .then((mediaStream) => {
          call.answer(mediaStream);
          call.on("stream", (remoteStream) => {
            callback(mediaStream, remoteStream);
          });
        })
        .catch((error) => {
          console.log("Error accessing media devices:", error);
        });
    });
  },
};

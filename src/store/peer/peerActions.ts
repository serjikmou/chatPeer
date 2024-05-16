import { PeerActionType } from "./peerTypes";
import { Dispatch } from "redux";
import { Data, DataType, PeerConnection } from "../../helpers/peer";
import { message } from "antd";
import {
  addConnectionList,
  removeConnectionList,
  setMessages,
} from "../connection/connectionActions";
import download from "js-file-download";

export const startPeerSession = (id: string) => ({
  type: PeerActionType.PEER_SESSION_START,
  id,
});

export const stopPeerSession = () => ({
  type: PeerActionType.PEER_SESSION_STOP,
});

export const setLoading = (loading: boolean) => ({
  type: PeerActionType.PEER_LOADING,
  loading,
});

export const setMessagesPeer = (text: string) => ({
  type: PeerActionType.PEER_ADDMESSAGE,
  text,
});
export const startPeer: () => (dispatch: Dispatch) => Promise<void> =
  () => async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const id = await PeerConnection.startPeerSession();
      PeerConnection.onIncomingConnection((conn) => {
        const peerId = conn.peer;
        message.info("Incoming connection: " + peerId);
        dispatch(addConnectionList(peerId));
        PeerConnection.onConnectionDisconnected(peerId, () => {
          message.info("Connection closed: " + peerId);
          dispatch(removeConnectionList(peerId));
        });
        PeerConnection.onConnectionReceiveData(
          peerId,
          (file: string | Data) => {
            if (typeof file === "string") {
              dispatch(setMessages("other" + file));
            } else {
              message.info(
                "Receiving file " + file.fileName + " from " + peerId
              );
              if (file.dataType === DataType.FILE) {
                download(
                  file.file || "",
                  file.fileName || "fileName",
                  file.fileType
                );
              }
            }
          }
        );
      });
      dispatch(startPeerSession(id));
      dispatch(setLoading(false));
    } catch (err) {
      console.log(err);
      dispatch(setLoading(false));
    }
  };

export interface IUser {
  Losses : number;
  Played : number;
  Wins   : number;
  blockedById : string[];
  email : string;
  friendsId : string[];
  id : string;
  isOnline : boolean;
  isPlaying : boolean;
  profilePicture : string;
  username : string;
  winrate : number;
}
  
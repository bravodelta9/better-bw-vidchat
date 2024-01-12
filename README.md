# Better Bateworld VidChat
A Firefox extension for a better Bateworld VidChat experience

## Features
A like/dislike system so you can highlight your favorite/least favorite people

## How to install
- Download & unzip, or clone this repo
- In Firefox, go to `about:debugging#/runtime/this-firefox` via the address bar
- Click `Load Temporary Add-on...`
- Navigate to the repo, select and open `manifest.json` (actually, any file should work)
- Go to [Bateworld's "VidChat by itself" page](https://bateworld.com/html5-chat/chatroom.php). You should see +/- buttons next to each user

## How to use

### Likes & Dislikes
Click the + or - button next to a user to mark them as liked/disliked.


## Support and Future Plans
### Support
I will not offer any support for this
You can, however, open a PR if you have fixes or improvements

### Future plans
* A rotate video function for chatters who are always upside down for some reason
* I could fix the DOM manipulation to allow it to work on the vidchat non-standalone page
  * But honestly, who thought it was ok to have something nested 2 iFrames deep, and who wants an *even* smaller viewport?
* Update likes from a user's profile page or your friends list
  * It's just so hard to remember usernames

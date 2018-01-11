# VibHub-Client
A client for remote controlled adult toys, using node and a raspberry pi.

This is a work in progress. The instructions will teach you how to set it up on a breadboard. I'm looking into options for making a pre-assembled kit, but don't expect any news on that soon.

## Acquire the HARDWARE!

Here's what you'll need to build this from scratch.

1. [A raspberry Pi](https://www.adafruit.com/product/3400) - $10. This guide will assume you're using a Zero W. Other models will work, but only verison 3 and zero W have built in bluetooth and wifi. Other versions will require a wireless adapter.
2. Generic equipment to make your pi run: [SD card](https://www.amazon.com/SanDisk%C2%AE-microSDHCTM-8GB-Memory-Card/dp/B0012Y2LLE) ~$7, [Power supply >= 1.5A](http://www.ikea.com/us/en/catalog/products/10291881/) ~$7.50.
3. [Lab cables](https://www.adafruit.com/product/1957) - ~$2. At least 9, of which all are M/M for pi zero (W), or 4 of them M/F for any other model.
4. [A breadboard](https://www.adafruit.com/product/64) ~$5. a tiny one will work. You can obviously just use some wire and solder it on directly, but this guide will show how to wire it on a breadboard.
5. **A Vibrating USB-Connected Toy** (variable price, mine was $9). USB ports are limited to 500mA, so all should work unless they're shoddy quality. I use one from the iSex series while developing this.
6. [A Female USB connector](https://www.aliexpress.com/item/10pcs-G55Y-USB-2-0-4Pin-A-Type-Female-Socket-Connector-Curly-Mouth-Bent-Foot-for/32819531738.html) <$1.
7. [An L293D motor controller chip](https://www.adafruit.com/product/807) ~$3. You can use another chip so long as it's rated high enough, but for the tutorial I'll be using the common LD293D.

Total cost: ~$45 depending on retailer and toy.

## Assemble the hardware!
Assembling the hardware is pretty easy:

![Fritzing Breadboard](https://i.imgur.com/KqITt8E.png)

Footnotes:
* The L293D chip has to lay across the divider like that
* For the USB connector, simply connect the two wires to the outermost pins. Reversing them means it goes backwards, which doesn't matter.
* The USB connector I used wasn't soldered to a plate. If you do get a pre-soldered connector, you'll have to refer to the manual for it.

## Installing prerequisites

### Raspbian
1. [Go here](https://www.raspberrypi.org/downloads/raspbian/) Download raspbian lite.
2. Follow the install instructions [here](https://www.raspberrypi.org/documentation/installation/installing-images/README.md).
3. After writing the image file, before unplugging the SD card from your computer, find the SD card in your navigator (windows explorer etc). It will be called "boot".
4. **Create a new file** directly on the boot drive and name it `wpa_supplicant.conf`
5. Edit the file and add the following, obviously replacing YourNetworkSSID with the name of your wifi, and "Your Network's Passphrase" with the password for your wifi.
<pre>
network={
       ssid="YourNetworkSSID"
       psk="Your Network's Passphrase"
       key_mgmt=WPA-PSK
}
</pre>
6. **Create a new file** on the boot drive and name it `ssh` **No file extension**, this will enable the SSH server by default.
7. Eject the drive and plug it into your pi, then connect the power cord to start it up. Boot will take a minute or two.

Footnotes:
* There are other ways of setting up the wifi, but this lets you do it before even the first boot. Just use google.
* If you use a pi 3 instead of zero w, you can simply plug in a monitor, keyboard, and network cable. If you have a large memory card you can instead install full raspbian instead of lite, this will give you a GUI when connected to a monitor.

### SSH
If you use a Pi Zero W, the easiest way to connect and maintain the device is through SSH. For this guide, I will use [putty](http://www.putty.org/). **Make sure your computer is connected to the same router that has the wifi you want to use.**

1. First off we need to figure out the IP of the raspberry pi. This is usually easiest done by accessing your router. Most commonly by going to `http://192.168.0.1`. If that doesn't take you to your router, you can open a command prompt Start Menu > type cmd.exe > hit enter. Type `ipconfig`and hit enter. You're looking for Default Gateway.
2. Network listing will vary drastically based on your router. The device will be called RaspberryPi or Pi or something like that. I've renamed mine to lab0. In my case it looks like this:
![Liksys router](https://i.imgur.com/SaypwpI.png)
3. You're looking for the IP address. In this case `192.168.0.194`
4. Start up putty. In host name (or IP address) enter the IP from the router, in my case `192.168.0.194`. Hit open at the bottom of the window.
5. If successful, it will open a new terminal and prompt you for a username and password. The default username is `pi` and password is `raspberry`. If not successful, unplug the device and restart from step 3 in the section above on installing raspbian.

### First setup
There are a few things you'll want to do before you install the VibHub app.

1. Enter in the terminal `sudo raspi-config`
2. Select Change User Password (selected by default) and hit enter. Enter a new password to access your device. Make sure to write it down somewhere. If you lose it you'll have to reinstall the entire thing.
3. (Optional) Go to localization options and setup local and timezone (unless you're in the UK which is default).
4. Select finish and hit enter. If it prompts you to reboot, do so now, then connect again via putty.
5. Now we need to install some prerequisites. Enter `cd` into the terminal and hit enter.
6. Enter `wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash` and hit enter to install NVM. This may be a bit outdated, so you might be better off [following the instructions here](https://github.com/creationix/nvm). After install, you may want to close the putty session (either by clicking the x or entering `exit`, then hitting enter), and opening it again.
7. Run `nvm install node` to install the latest verison of nodejs. To test if the install worked, you can enter `node -v` which will output the installed version of node.
8. Run `sudo apt install pigpio git` to install the pigpio library and git.

These should be all dependencies you need. Time to install vibhub.


## Making your device accessible through VibHub
Ok you now have a fully functioning raspberry pi install with all prerequisites. Time to install the actual VibHub app.

1. Enter the terminal and type `cd` followed by enter. This will make sure you're at your home directory.
2. Enter `git clone https://github.com/JasXSL/VibHub-Client` and hit enter. This will download this project into a directory called "VibHub-Client".
3. Enter the directory by typing `cd VibHub-Client` followed by enter.
4. Enter `npm install` to automatically install all libraries needed. This will take a while based on your connection speed and the model of raspberry pi you went with.
5. Lets run the darn thing and see if it worked. Type `sudo node index`. Hopefully you didn't get any error messages. If you did, go to the issues tab on this page and report a new issue. If it DID work, you will see a message in the terminal like `Socket Connected, my ID is  bbec4714-acdb-4b1f-99a5-1647a0f910f5`. This ID key is what apps use to interface with your device. You can either copy or write it down somewhere, or create a custom one in the next step. To start using the device, simply enter the device ID into an app that supports the device, and start playing with it! Or if you want to use the API, check out the wiki.
6. Ok so UUIDv4 isn't very easy to remember, for this purpose we can change the device-id file. Hit ctrl+c to close the app.
7. Enter `sudo nano device-id`, this brings up the nano text editor.
8. Delete the key there and replace it with your own custom passphrase. Make sure there are no newlines there. Try to use a long unique passphrase. **If someone else enters the same passphrase on their own device, both of your devices will be controlled from the same commands!** You can also use this yourself if you have multiple VibHub devices that you want to control from a single API call.
9. Hit ctrl+x followed by enter to save the changes.
10. Run `sudo node index` to start the app again. You should see that your device id has changed! Keep in mind you'll have to update all apps with your new device ID if you change it.

## Setting your device up as a service
Ok so now we got the app up and running, but it stops when we close the SSH session. To keep the app running at all times while the device is powered and booted, we'll need to set up a service.

1. Enter the terminal and type in `cd /etc/systemd/system` to take you to the systemd service directory.
2. Type `sudo nano vibhub.service` to open the text editor.
3. Enter the following (protip: with putty you can paste by right clicking the window):
<pre>
[Unit]
description=VibHub Device
After=network.target

[Service]
ExecStart=/usr/local/bin/node /home/pi/VibHub-Client/index
Restart=always
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=vibhub
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
</pre>
4. Type `sudo systemctl enable vibhub` and hit enter
5. Type `sudo service vibhub start` and hit enter

If everything worked correctly, the VibHub app should now auto run whenever the pi is turned on.

Tip: If you decide to change the device-id after starting the service, you can restart the service with `sudo service vibhub restart`

# Making apps
See the wiki!



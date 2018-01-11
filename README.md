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
4. Create a new file directly on the boot drive and name it `wpa_supplicant.conf`
5. Edit the file and add the following, obviously replacing YourNetworkSSID with the name of your wifi, and "Your Network's Passphrase" with the password for your wifi.
<pre>
network={
       ssid="YourNetworkSSID"
       psk="Your Network's Passphrase"
       key_mgmt=WPA-PSK
}
</pre>
6. Eject the drive and plug it into your pi, then connect the power cord to start it up. Boot will take a minute or two.

Footnotes:
* There are other ways of setting up the wifi, but this lets you do it before even the first boot. Just use google.
* If you use a pi 3 instead of zero w, you can simply plug in a monitor, keyboard, and network cable. If you have a large memory card you can instead install full raspbian instead of lite, this will give you a GUI when connected to a monitor.

### SSH
If you use a Pi Zero W, the easiest way to connect and maintain the device is through SSH. For this guide, I will use [putty](http://www.putty.org/). **Make sure your computer is connected to the same router that has the wifi you want to use.**

1. First off we need to figure out the IP of the raspberry pi. This is usually easiest done by accessing your router. Most commonly by going to `http://192.168.0.1`. If that doesn't take you to your router, you can open a command prompt Start Menu > type cmd.exe > hit enter. Type `ipconfig`and hit enter. You're looking for Default Gateway.
2. Network listing will vary drastically based on your router. The device will be called RaspberryPi or Pi or something like that. I've renamed mine to lab0. In my case it looks like this:
![Liksys router](https://i.imgur.com/SaypwpI.png)
3. You're looking for the IP address. In this case 192.168.0.194



## Setting up your device

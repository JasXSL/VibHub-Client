# VibHub-Client
A client for remote controlled adult toys, using node and a raspberry pi.

This is a work in progress. The instructions will teach you how to set it up on a breadboard. I'm looking into options for making a pre-assembled kit, but don't expect any news on that soon.

## Assemble the HARDWARE!

Here's what you'll need to build this from scratch.

1. [A raspberry Pi](https://www.adafruit.com/product/3400) - $10. This guide will assume you're using a Zero W. Other models will work, but only verison 3 and zero W have built in bluetooth and wifi. Other versions will require a wireless adapter.
2. Generic equipment to make your pi run: [SD card](https://www.amazon.com/SanDisk%C2%AE-microSDHCTM-8GB-Memory-Card/dp/B0012Y2LLE) ~$7, [Power supply >= 1.5A](http://www.ikea.com/us/en/catalog/products/10291881/) ~$7.50.
3. [Lab cables](https://www.adafruit.com/product/1957) - ~$2. At least 7, of which all are M/M for pi zero (W), or 4 M/F for any other model.
4. [A breadboard](https://www.adafruit.com/product/64) ~$5. a tiny one will work. You can obviously just use some wire and solder it on directly, but this guide will show how to wire it on a breadboard.
5. **A Vibrating USB-Connected Toy** (variable price, mine was $9). USB ports are limited to 500mA, so all should work unless they're shoddy quality. I use one from the iSex series while developing this.
6. [A Female USB connector](https://www.aliexpress.com/item/10pcs-G55Y-USB-2-0-4Pin-A-Type-Female-Socket-Connector-Curly-Mouth-Bent-Foot-for/32819531738.html) <$1.
7. [An L293D motor controller chip](https://www.adafruit.com/product/807) ~$3. You can use another chip so long as it's rated high enough, but for the tutorial I'll be using the common LD293D.

Total cost: ~$45 depending on retailer and toy.

## Installing prerequisites


## Setting up your device

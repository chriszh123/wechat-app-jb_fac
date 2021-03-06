const WXAPI = require('../../wxapi/main')
//获取应用实例
var app = getApp();
var WxParse = require('../../wxParse/wxParse.js');
const regeneratorRuntime = require('../../utils/runtime');
const SelectSizePrefix = "选择："

Page({
    data: {
        autoplay: true,
        interval: 3000,
        duration: 1000,
        goodsDetail: {},
        business: {},
        swiperCurrent: 0,
        hasMoreSelect: false,
        selectSize: "选择：",
        selectSizePrice: 0,
        totalScoreToPay: 0,
        shopNum: 0,
        hideShopPopup: true,
        buyNumber: 0,
        buyNumMin: 1,
        buyNumMax: 0,

        openShare: false,

        propertyChildIds: "",
        propertyChildNames: "",
        canSubmit: false, //  选中规格尺寸时候是否允许加入购物车
        shopCarInfo: {},
        shopType: "addShopCar", //购物类型，加入购物车或立即购买，默认为加入购物车
        currentPages: undefined,
        showSignUpBtn: false, // 我也要报名参与 按钮是否显示
        disabaleInvitedHelpJjBtn: true, // 邀请朋友帮忙按钮是否可以点击
        showBuyBtn4Kanjia: false, // 是否显示砍价商品详情页上的“用当前价购买”按钮
        curuid: undefined // 当前用户uid

    },
    telBusiness: function (e) {
        var that = this;
        // 拨打商品商家电话
        if (that.data.business && that.data.business.phone && that.data.business.phone != '') {
            wx.makePhoneCall({
                phoneNumber: that.data.business.phone
            });
        } else {
            wx.showToast({
                title: '请联系管理员，完善卖家手机号码', //提示的内容,
                icon: 'none', //图标,
                duration: 3000, //延迟时间,
                mask: true, //显示透明蒙层，防止触摸穿透,
                success: res => { }
            });
        }
    },
    //事件处理函数
    swiperchange: function (e) {
        //console.log(e.detail.current)
        this.setData({
            swiperCurrent: e.detail.current
        })
    },
    onLoad: function (e) {
        if (e && e.scene) {
            // 处理扫码进商品详情页面的逻辑：扫描小程序码
            const scene = decodeURIComponent(e.scene);
            if (scene) {
                // 商品id
                var prodId = scene.split(',')[0];
                e.id = prodId;
                // 邀请人uid
                var inviterUid = scene.split(',')[1];
                wx.setStorage({
                    key: 'inviterid_' + prodId,
                    data: inviterUid
                });
            }
        }

        // inviter_id：邀请人id,有值时，说明这个商品明细页面是通过别人分享过来的，后面如果买了，需要给分享人佣金
        if (e.inviter_id) {
            // 当前商品分享人:{key:inviterid_ + 商品id, value:分享人id}
            wx.setStorage({
                key: 'inviterid_' + e.id,
                data: e.inviter_id
            });
            // 推荐者
            wx.setStorage({
                key: 'referrer',
                data: e.inviter_id
            })
        }

        this.data.goodsId = e.id;
        const that = this;
        // 砍价助力者打开商品详情页时
        this.data.kjJoinUid = e.kjJoinUid;

        // 砍价需求暂时忽略 20190215
        // that.data.kjId = e.kjId;
        // 获取购物车数据
        wx.getStorage({
            key: 'shopCarInfo',
            success: function (res) {
                that.setData({
                    shopCarInfo: res.data,
                    shopNum: res.data.shopNum,
                    curuid: wx.getStorageSync('uid')
                });
            }
        });
        // 当前商品明细信息
        WXAPI.goodsDetail(e.id).then(function (res) {
            var selectSizeTemp = "";
            // 规格:暂时忽略 20190215
            if (res.data.properties) {
                for (var i = 0; i < res.data.properties.length; i++) {
                    selectSizeTemp = selectSizeTemp + " " + res.data.properties[i].name;
                }
                that.setData({
                    hasMoreSelect: true,
                    selectSize: that.data.selectSize + selectSizeTemp,
                    selectSizePrice: res.data.basicInfo.minPrice,
                    totalScoreToPay: res.data.basicInfo.minScore
                });
            }
            // 拼团:暂时忽略 20190215
            if (res.data.basicInfo.pingtuan) {
                that.pingtuanList(e.id)
            }
            that.data.goodsDetail = res.data;
            // 商品视频:暂时忽略 20190215
            if (res.data.basicInfo.videoId) {
                that.getVideoSrc(res.data.basicInfo.videoId);
            }
            that.setData({
                goodsDetail: res.data,
                business: res.data.business,
                selectSizePrice: res.data.basicInfo.minPrice,
                totalScoreToPay: res.data.basicInfo.minScore,
                buyNumMax: res.data.basicInfo.stores,
                buyNumber: (res.data.basicInfo.stores > 0) ? 1 : 0,
                currentPages: getCurrentPages()
            });
            WxParse.wxParse('article', 'html', res.data.content, that, 5);
        })
        this.reputation(e.id);
        // 砍价需求暂时忽略 20190215
        // this.getKanjiaInfo(e.id);
    },
    onShow: function () {
        this.getGoodsDetailAndKanjieInfo(this.data.goodsId);
    },
    async getGoodsDetailAndKanjieInfo(goodsId) {
        const that = this;
        const goodsDetailRes = await WXAPI.goodsDetail(goodsId)
        const goodsKanjiaSetRes = await WXAPI.kanjiaSet(goodsId)
        if (goodsDetailRes.code == 0) {
            var selectSizeTemp = SelectSizePrefix;
            if (goodsDetailRes.data.properties) {
                for (var i = 0; i < goodsDetailRes.data.properties.length; i++) {
                    selectSizeTemp = selectSizeTemp + " " + goodsDetailRes.data.properties[i].name;
                }
                that.setData({
                    hasMoreSelect: true,
                    selectSize: selectSizeTemp,
                    selectSizePrice: goodsDetailRes.data.basicInfo.minPrice,
                    totalScoreToPay: goodsDetailRes.data.basicInfo.minScore
                });
            }
            if (goodsDetailRes.data.basicInfo.pingtuan) {
                that.pingtuanList(goodsId)
            }
            that.data.goodsDetail = goodsDetailRes.data;
            if (goodsDetailRes.data.basicInfo.videoId) {
                that.getVideoSrc(goodsDetailRes.data.basicInfo.videoId);
            }
            let _data = {
                goodsDetail: goodsDetailRes.data,
                selectSizePrice: goodsDetailRes.data.basicInfo.minPrice,
                totalScoreToPay: goodsDetailRes.data.basicInfo.minScore,
                buyNumMax: goodsDetailRes.data.basicInfo.stores,
                buyNumber: (goodsDetailRes.data.basicInfo.stores > 0) ? 1 : 0,
                currentPages: getCurrentPages()
            }
            if (goodsKanjiaSetRes.code == 0) {
                _data.curGoodsKanjia = goodsKanjiaSetRes.data;
                that.data.kjId = goodsKanjiaSetRes.data.id;
                // 获取当前砍价进度
                if (!that.data.kjJoinUid) {
                    that.data.kjJoinUid = wx.getStorageSync('uid');
                }
                const curKanjiaprogress = await WXAPI.kanjiaDetail(goodsKanjiaSetRes.data.id, that.data.kjJoinUid);
                const myHelpDetail = await WXAPI.kanjiaHelpDetail(goodsKanjiaSetRes.data.id, that.data.kjJoinUid, wx.getStorageSync('token'))
                if (curKanjiaprogress.code == 0) {
                    _data.curKanjiaprogress = curKanjiaprogress.data
                }
                if (myHelpDetail.code == 0) {
                    _data.myHelpDetail = myHelpDetail.data
                }
            }
            if (goodsDetailRes.data.basicInfo.pingtuan) {
                const pingtuanSetRes = await WXAPI.pingtuanSet(goodsId)
                if (pingtuanSetRes.code == 0) {
                    _data.pingtuanSet = pingtuanSetRes.data
                }
            }

            // 是否显示 我也要报名按钮
            _data.curuid = wx.getStorageSync('uid');
            var showSignUpBtn = _data.curGoodsKanjia && (!_data.curKanjiaprogress || (_data.curKanjiaprogress.kanjiaInfo && _data.curKanjiaprogress.kanjiaInfo.uid != _data.curuid));
            if (showSignUpBtn == undefined) {
                showSignUpBtn = false;
            }
            _data.showSignUpBtn = showSignUpBtn;

            // 邀请朋友帮忙按钮是否可以点击
            _data.disabaleInvitedHelpJjBtn = false;
            if (_data.curGoodsKanjia && _data.curKanjiaprogress && _data.curKanjiaprogress.kanjiaInfo) {
                _data.disabaleInvitedHelpJjBtn = _data.curKanjiaprogress.kanjiaInfo.upToMinPrice;
            }
            console.log("---------------_data.disabaleInvitedHelpJjBtn = " + _data.disabaleInvitedHelpJjBtn);

            // 详情页上是否显示“用当前价购买”按钮：是砍价商品 + 当前用户是砍价活动参与者
            _data.showBuyBtn4Kanjia = false;
            if (_data.curGoodsKanjia && _data.curKanjiaprogress && _data.curKanjiaprogress.kanjiaInfo && _data.curKanjiaprogress.kanjiaInfo.uid) {
                var showBuyBtn4Kanjia = _data.curKanjiaprogress.kanjiaInfo.uid == _data.curuid;
                _data.showBuyBtn4Kanjia = showBuyBtn4Kanjia;
            }

            that.setData(_data);
            WxParse.wxParse('article', 'html', goodsDetailRes.data.content, that, 5);


        }
    },
    joinKanjia: function () { // 报名参加砍价活动
        const _this = this;
        if (!_this.data.curGoodsKanjia) {
            return;
        }
        wx.showLoading({
            title: '加载中',
            mask: true
        })
        WXAPI.kanjiaJoin(_this.data.curGoodsKanjia.id, wx.getStorageSync('token')).then(function (res) {
            wx.hideLoading()
            if (res.code == 0) {
                _this.data.kjJoinUid = wx.getStorageSync('uid')
                _this.getGoodsDetailAndKanjieInfo(_this.data.goodsDetail.basicInfo.id)
            } else {
                wx.showToast({
                    title: res.msg,
                    icon: 'none'
                })
            }
        })
    },

    helpKanjia() {
        const _this = this;
        _this.helpKanjiaDone();
    },

    helpKanjiaDone() {
        const _this = this;
        WXAPI.kanjiaHelp(_this.data.kjId, _this.data.kjJoinUid, wx.getStorageSync('token'), '').then(function (res) {
            if (res.code != 0) {
                wx.showToast({
                    title: res.msg,
                    icon: 'none'
                })
                return;
            }
            _this.setData({
                myHelpDetail: res.data
            });
            wx.showModal({
                title: '成功',
                content: '成功帮TA砍掉 ' + res.data.cutPrice + ' 元',
                showCancel: false
            })
            _this.getGoodsDetailAndKanjieInfo(_this.data.goodsDetail.basicInfo.id)
        })
    },

    // 去购物车
    goShopCar: function () {
        wx.reLaunch({
            url: "/pages/shop-cart/index"
        });
    },
    // 加入购物车
    toAddShopCar: function () {
        this.setData({
            shopType: "addShopCar"
        })
        this.bindGuiGeTap();
    },
    // 单独购买
    tobuy: function () {
        this.setData({
            shopType: "tobuy",
            selectSizePrice: this.data.goodsDetail.basicInfo.minPrice
        });

        // 存储当前砍价活动的最新价格
        var that = this;
        var curKanjiaprogress = that.data.curKanjiaprogress;
        if (curKanjiaprogress && curKanjiaprogress.kanjiaInfo) {
            var prodId = curKanjiaprogress.kanjiaInfo.prodId;
            var curPrice = curKanjiaprogress.kanjiaInfo.curPrice;
            var kjprodKey = "kjprod_" + prodId;
            var kjprodValue = curPrice;
            wx.setStorageSync(kjprodKey, kjprodValue);
            console.log("*******************kjprodKey = " + kjprodKey, " , kjprodValue = " + kjprodValue);
        }

        this.bindGuiGeTap();
    },
    // 去拼单: 拼团暂忽略 20190215
    toPingtuan: function (e) {
        let pingtuanopenid = 0
        if (e.currentTarget.dataset.pingtuanopenid) {
            pingtuanopenid = e.currentTarget.dataset.pingtuanopenid
        }
        this.setData({
            shopType: "toPingtuan",
            selectSizePrice: this.data.goodsDetail.basicInfo.pingtuanPrice,
            pingtuanopenid: pingtuanopenid
        });
        this.bindGuiGeTap();
    },
    /**
     * 规格选择弹出框
     */
    bindGuiGeTap: function () {
        this.setData({
            hideShopPopup: false
        })
    },
    /**
     * 规格选择弹出框隐藏
     */
    closePopupTap: function () {
        this.setData({
            hideShopPopup: true
        })
    },
    // 商品购买数量：减号
    numJianTap: function () {
        if (this.data.buyNumber > this.data.buyNumMin) {
            var currentNum = this.data.buyNumber;
            currentNum--;
            this.setData({
                buyNumber: currentNum
            })
        }
    },
    // 商品购买数量：加号
    numJiaTap: function () {
        if (this.data.buyNumber < this.data.buyNumMax) {
            var currentNum = this.data.buyNumber;
            currentNum++;
            this.setData({
                buyNumber: currentNum
            })
        }
    },
    /**
     * 选择商品规格:暂不考虑商品规格 20190215
     * @param {Object} e
     */
    labelItemTap: function (e) {
        var that = this;
        /*
        console.log(e)
        console.log(e.currentTarget.dataset.propertyid)
        console.log(e.currentTarget.dataset.propertyname)
        console.log(e.currentTarget.dataset.propertychildid)
        console.log(e.currentTarget.dataset.propertychildname)
        */
        // 取消该分类下的子栏目所有的选中状态
        var childs = that.data.goodsDetail.properties[e.currentTarget.dataset.propertyindex].childsCurGoods;
        for (var i = 0; i < childs.length; i++) {
            that.data.goodsDetail.properties[e.currentTarget.dataset.propertyindex].childsCurGoods[i].active = false;
        }
        // 设置当前选中状态
        that.data.goodsDetail.properties[e.currentTarget.dataset.propertyindex].childsCurGoods[e.currentTarget.dataset.propertychildindex].active = true;
        // 获取所有的选中规格尺寸数据
        var needSelectNum = that.data.goodsDetail.properties.length;
        var curSelectNum = 0;
        var propertyChildIds = "";
        var propertyChildNames = "";
        for (var i = 0; i < that.data.goodsDetail.properties.length; i++) {
            childs = that.data.goodsDetail.properties[i].childsCurGoods;
            for (var j = 0; j < childs.length; j++) {
                if (childs[j].active) {
                    curSelectNum++;
                    propertyChildIds = propertyChildIds + that.data.goodsDetail.properties[i].id + ":" + childs[j].id + ",";
                    propertyChildNames = propertyChildNames + that.data.goodsDetail.properties[i].name + ":" + childs[j].name + "  ";
                }
            }
        }
        var canSubmit = false;
        if (needSelectNum == curSelectNum) {
            canSubmit = true;
        }
        // 计算当前价格
        if (canSubmit) {
            WXAPI.goodsPrice({
                goodsId: that.data.goodsDetail.basicInfo.id,
                propertyChildIds: propertyChildIds
            }).then(function (res) {
                that.setData({
                    selectSizePrice: res.data.price,
                    totalScoreToPay: res.data.score,
                    propertyChildIds: propertyChildIds,
                    propertyChildNames: propertyChildNames,
                    buyNumMax: res.data.stores,
                    buyNumber: (res.data.stores > 0) ? 1 : 0
                });
            })
        }


        this.setData({
            goodsDetail: that.data.goodsDetail,
            canSubmit: canSubmit
        })
    },
    /**
     * 加入购物车
     */
    addShopCar: function () {
        // 当前商品存在子规格
        if (this.data.goodsDetail.properties && !this.data.canSubmit) {
            if (!this.data.canSubmit) {
                wx.showModal({
                    title: '',
                    content: '请选择商品规格！',
                    showCancel: false
                })
            }
            this.bindGuiGeTap();
            return;
        }
        if (this.data.buyNumber < 1) {
            wx.showModal({
                title: '',
                content: '购买数量不能为0！',
                showCancel: false
            })
            return;
        }
        //组建购物车
        var shopCarInfo = this.bulidShopCarInfo();
        this.setData({
            shopCarInfo: shopCarInfo,
            shopNum: shopCarInfo.shopNum
        });

        // 写入本地存储
        wx.setStorage({
            key: 'shopCarInfo',
            data: shopCarInfo
        })
        // 隐藏规格选择弹出框
        this.closePopupTap();
        wx.showToast({
            title: '加入购物车成功',
            icon: 'success',
            duration: 2000
        })
        //console.log(shopCarInfo);

        //shopCarInfo = {shopNum:12,shopList:[]}
    },
    /**
     * 立即购买
     */
    buyNow: function (e) {
        let that = this
        let shoptype = e.currentTarget.dataset.shoptype
        console.log("buyNow = " + shoptype);
        // 当前商品存在子规格的场景
        if (this.data.goodsDetail.properties && !this.data.canSubmit) {
            if (!this.data.canSubmit) {
                wx.showModal({
                    title: '',
                    content: '请选择商品规格！',
                    showCancel: false
                })
            }
            this.bindGuiGeTap();
            wx.showModal({
                title: '',
                content: '请先选择规格尺寸哦~',
                showCancel: false
            })
            return;
        }

        if (this.data.buyNumber < 1) {
            wx.showModal({
                title: '',
                content: '购买数量不能为0！',
                showCancel: false
            })
            return;
        }

        //组建立即购买信息
        var buyNowInfo = this.buliduBuyNowInfo(shoptype);
        // 写入本地存储
        wx.setStorage({
            key: "buyNowInfo",
            data: buyNowInfo
        })
        // 隐藏商品规格弹框
        this.closePopupTap();
        if (shoptype == 'toPingtuan') {
            if (this.data.pingtuanopenid) {
                wx.navigateTo({
                    url: "/pages/to-pay-order/index?orderType=buyNow&pingtuanOpenId=" + this.data.pingtuanopenid
                })
            } else {
                WXAPI.pingtuanOpen(that.data.goodsDetail.basicInfo.id, wx.getStorageSync('token')).then(function (res) {
                    if (res.code != 0) {
                        wx.showToast({
                            title: res.msg,
                            icon: 'none',
                            duration: 2000
                        })
                        return
                    }
                    wx.navigateTo({
                        url: "/pages/to-pay-order/index?orderType=buyNow&pingtuanOpenId=" + res.data.id
                    })
                })
            }
        } else {
            wx.navigateTo({
                url: "/pages/to-pay-order/index?orderType=buyNow"
            })
        }

    },
    /**
     * 组建购物车信息
     */
    bulidShopCarInfo: function () {
        // 加入购物车
        var shopCarMap = {};
        shopCarMap.goodsId = this.data.goodsDetail.basicInfo.id;
        shopCarMap.pic = this.data.goodsDetail.basicInfo.pic;
        shopCarMap.name = this.data.goodsDetail.basicInfo.name;
        // shopCarMap.label=this.data.goodsDetail.basicInfo.id; 规格尺寸 
        shopCarMap.propertyChildIds = this.data.propertyChildIds;
        shopCarMap.label = this.data.propertyChildNames;
        shopCarMap.price = this.data.selectSizePrice;
        shopCarMap.score = this.data.totalScoreToPay;
        shopCarMap.left = "";
        shopCarMap.active = true;
        shopCarMap.number = this.data.buyNumber;
        shopCarMap.logisticsType = this.data.goodsDetail.basicInfo.logisticsId;
        shopCarMap.logistics = this.data.goodsDetail.logistics;
        shopCarMap.weight = this.data.goodsDetail.basicInfo.weight;

        var shopCarInfo = this.data.shopCarInfo;
        if (!shopCarInfo.shopNum) {
            shopCarInfo.shopNum = 0;
        }
        if (!shopCarInfo.shopList) {
            shopCarInfo.shopList = [];
        }
        var hasSameGoodsIndex = -1;
        for (var i = 0; i < shopCarInfo.shopList.length; i++) {
            var tmpShopCarMap = shopCarInfo.shopList[i];
            if (tmpShopCarMap.goodsId == shopCarMap.goodsId && tmpShopCarMap.propertyChildIds == shopCarMap.propertyChildIds) {
                hasSameGoodsIndex = i;
                shopCarMap.number = shopCarMap.number + tmpShopCarMap.number;
                break;
            }
        }

        shopCarInfo.shopNum = shopCarInfo.shopNum + this.data.buyNumber;
        if (hasSameGoodsIndex > -1) {
            shopCarInfo.shopList.splice(hasSameGoodsIndex, 1, shopCarMap);
        } else {
            shopCarInfo.shopList.push(shopCarMap);
        }
        shopCarInfo.kjId = this.data.kjId;
        return shopCarInfo;
    },
    /**
     * 组建立即购买信息
     */
    buliduBuyNowInfo: function (shoptype) {
        var shopCarMap = {};
        shopCarMap.goodsId = this.data.goodsDetail.basicInfo.id;
        shopCarMap.pic = this.data.goodsDetail.basicInfo.pic;
        shopCarMap.name = this.data.goodsDetail.basicInfo.name;
        // shopCarMap.label=this.data.goodsDetail.basicInfo.id; 规格尺寸 
        shopCarMap.propertyChildIds = this.data.propertyChildIds;
        shopCarMap.label = this.data.propertyChildNames;
        shopCarMap.price = this.data.selectSizePrice;
        if (shoptype == 'toPingtuan') {
            shopCarMap.price = this.data.goodsDetail.basicInfo.pingtuanPrice;
        }
        shopCarMap.score = this.data.totalScoreToPay;
        shopCarMap.left = "";
        shopCarMap.active = true;
        shopCarMap.number = this.data.buyNumber;
        shopCarMap.logisticsType = this.data.goodsDetail.basicInfo.logisticsId;
        shopCarMap.logistics = this.data.goodsDetail.logistics;
        shopCarMap.weight = this.data.goodsDetail.basicInfo.weight;

        var buyNowInfo = {};
        if (!buyNowInfo.shopNum) {
            buyNowInfo.shopNum = 0;
        }
        if (!buyNowInfo.shopList) {
            buyNowInfo.shopList = [];
        }
        /*    var hasSameGoodsIndex = -1;
            for (var i = 0; i < toBuyInfo.shopList.length; i++) {
              var tmpShopCarMap = toBuyInfo.shopList[i];
              if (tmpShopCarMap.goodsId == shopCarMap.goodsId && tmpShopCarMap.propertyChildIds == shopCarMap.propertyChildIds) {
                hasSameGoodsIndex = i;
                shopCarMap.number = shopCarMap.number + tmpShopCarMap.number;
                break;
              }
            }
            toBuyInfo.shopNum = toBuyInfo.shopNum + this.data.buyNumber;
            if (hasSameGoodsIndex > -1) {
              toBuyInfo.shopList.splice(hasSameGoodsIndex, 1, shopCarMap);
            } else {
              toBuyInfo.shopList.push(shopCarMap);
            }*/

        buyNowInfo.shopList.push(shopCarMap);
        buyNowInfo.kjId = this.data.kjId;
        return buyNowInfo;
    },
    onShareAppMessage: function () {
        let _data = {
            title: this.data.goodsDetail.basicInfo.name,
            path: '/pages/goods-details/index?id=' + this.data.goodsDetail.basicInfo.id + '&inviter_id=' + wx.getStorageSync('uid'), // 商品分享出去时带上当前用户id
            success: function (res) {
                // 转发成功
            },
            fail: function (res) {
                // 转发失败
            }
        };

        // 砍价助力跳转
        if (this.data.kjJoinUid) {
            _data.title = this.data.curKanjiaprogress.joiner.nick + '邀请您帮TA砍价',
                _data.path += '&kjJoinUid=' + this.data.kjJoinUid
        }

        return _data;
    },
    reputation: function (goodsId) {
        var that = this;
        WXAPI.goodsReputation({
            goodsId: goodsId
        }).then(function (res) {
            if (res.code == 0) {
                that.setData({
                    reputation: res.data
                });
            }
        })
    },
    pingtuanList: function (goodsId) {
        var that = this;
        WXAPI.pingtuanList(goodsId).then(function (res) {
            if (res.code == 0) {
                that.setData({
                    pingtuanList: res.data
                });
            }
        })
    },
    getVideoSrc: function (videoId) {
        var that = this;
        WXAPI.videoDetail(videoId).then(function (res) {
            if (res.code == 0) {
                that.setData({
                    videoMp4Src: res.data.fdMp4
                });
            }
        })
    },
    getKanjiaInfo: function (gid) {
        var that = this;
        if (!app.globalData.kanjiaList || app.globalData.kanjiaList.length == 0) {
            that.setData({
                curGoodsKanjia: null
            });
            return;
        }
        let curGoodsKanjia = app.globalData.kanjiaList.find(ele => {
            return ele.goodsId == gid
        });
        if (curGoodsKanjia) {
            that.setData({
                curGoodsKanjia: curGoodsKanjia
            });
        } else {
            that.setData({
                curGoodsKanjia: null
            });
        }
    },
    goKanjia: function () {
        var that = this;
        if (!that.data.curGoodsKanjia) {
            return;
        }
        WXAPI.kanjiaJoin(that.data.curGoodsKanjia.id, wx.getStorageSync('token')).then(function (res) {
            if (res.code == 0) {
                wx.navigateTo({
                    url: "/pages/kanjia/index?kjId=" + res.data.kjId + "&joiner=" + res.data.uid + "&id=" + res.data.goodsId
                })
            } else {
                wx.showModal({
                    title: '',
                    content: res.msg,
                    showCancel: false
                })
            }
        })
    },
    joinPingtuan: function (e) {
        let pingtuanopenid = e.currentTarget.dataset.pingtuanopenid
        wx.navigateTo({
            url: "/pages/to-pay-order/index?orderType=buyNow&pingtuanOpenId=" + pingtuanopenid
        })
    },
    goIndex() {
        wx.switchTab({
            url: '/pages/index/index',
        });
    },
    openShareDiv() {
        this.setData({
            openShare: true
        })
    },
    closeShareDiv() {
        this.setData({
            openShare: false
        });
    },
    toPoster: function (e) {
        // 点击生成海报界面
        wx.navigateTo({
            url: "/pages/goods-details/poster?goodsid=" + e.currentTarget.dataset.goodsid
        })
    }
})
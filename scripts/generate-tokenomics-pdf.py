#!/usr/bin/env python3
"""Generate 华尔街人生 token mechanism PDF."""

import shutil
from fpdf import FPDF

FONT_PATH = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
OUTPUT_PATH = "/workspace/artifacts/华尔街人生-代币机制介绍.pdf"
OUTPUT_PATH_ALT = "/opt/cursor/artifacts/华尔街人生-代币机制介绍.pdf"

PRESALE_ADDRESS = "0xc71561fAAA3Ac1070878D69A51e33F412DD8208e"
USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"


class TokenomicsPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.add_font("wqy", "", FONT_PATH)
        self.add_font("wqy", "B", FONT_PATH)
        self.set_auto_page_break(auto=True, margin=18)

    def footer(self):
        self.set_y(-12)
        self.set_font("wqy", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(
            0,
            8,
            f"华尔街人生 Wall Street Life  |  www.bestha.asia  |  第 {self.page_no()} 页",
            align="C",
        )

    def cover(self):
        self.add_page()
        self.set_fill_color(20, 8, 8)
        self.rect(0, 0, 210, 297, style="F")
        self.set_y(70)
        self.set_font("wqy", "B", 32)
        self.set_text_color(255, 215, 0)
        self.cell(0, 16, "华尔街人生", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)
        self.set_font("wqy", "", 18)
        self.set_text_color(255, 240, 200)
        self.cell(0, 12, "Wall Street Life", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)
        self.set_font("wqy", "B", 22)
        self.set_text_color(255, 255, 255)
        self.cell(0, 12, "代币机制介绍", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(8)
        self.set_font("wqy", "", 13)
        self.set_text_color(220, 200, 160)
        self.cell(0, 10, "持币共享标普 · 纳指 · 美股红利", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(30)
        self.set_font("wqy", "", 11)
        self.set_text_color(180, 180, 180)
        self.cell(0, 8, "官网：www.bestha.asia", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, "公链：BNB Chain（BSC）", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, "文档版本：2026 年 7 月", align="C")

    def section_title(self, num: str, title: str):
        self.ln(4)
        self.set_fill_color(42, 10, 10)
        self.set_text_color(255, 215, 0)
        self.set_font("wqy", "B", 14)
        self.cell(0, 10, f"  {num}  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)
        self.set_text_color(30, 30, 30)

    def sub_title(self, title: str):
        self.set_font("wqy", "B", 11)
        self.set_text_color(60, 15, 15)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)
        self.set_text_color(30, 30, 30)

    def body(self, text: str):
        self.set_font("wqy", "", 10.5)
        self.multi_cell(0, 6.5, text)
        self.ln(2)

    def bullet(self, text: str):
        self.set_font("wqy", "", 10.5)
        self.multi_cell(0, 6.5, f"  •  {text}")
        self.ln(1)

    def kv_row(self, key: str, value: str):
        x0 = self.get_x()
        y0 = self.get_y()
        self.set_font("wqy", "B", 10)
        self.set_xy(x0, y0)
        self.cell(48, 7, key, border=1)
        self.set_font("wqy", "", 9.5)
        self.set_xy(x0 + 48, y0)
        self.multi_cell(142, 7, value, border=1)
        self.set_xy(x0, y0 + 7)
        if self.get_y() > 270:
            self.add_page()

    def code_block(self, text: str):
        self.set_fill_color(245, 245, 245)
        self.set_font("wqy", "", 9.5)
        self.set_text_color(40, 40, 40)
        x, y = self.get_x(), self.get_y()
        lines = text.strip().split("\n")
        h = len(lines) * 6 + 6
        self.rect(x, y, 190, h, style="F")
        self.set_xy(x + 4, y + 3)
        for line in lines:
            self.cell(0, 6, line, new_x="LMARGIN", new_y="NEXT")
            self.set_x(x + 4)
        self.set_y(y + h + 2)
        self.set_text_color(30, 30, 30)


def build_pdf():
    pdf = TokenomicsPDF()
    pdf.set_margins(15, 15, 15)
    pdf.cover()

    pdf.add_page()
    pdf.section_title("一", "项目定位")
    pdf.body(
        "华尔街人生（Wall Street Life，符号 $华尔街人生 / $WSL）是部署于 BNB Chain（BSC）的"
        "股票分红型代币，是 BNB 链上首个将传统美股股息收益引入链上的创新项目。"
    )
    pdf.body("持有 $华尔街人生，即可按比例分享以下资产的股息收益：")
    for item in [
        "标普 500（S&P 500）成分股股息",
        "纳斯达克 100（NASDAQ 100）成分股股息",
        "苹果、英伟达、微软、特斯拉等热门美股股息",
    ]:
        pdf.bullet(item)
    pdf.body(
        "项目将华尔街的分红回报引入链上，让每一位持币者以较低门槛共享全球资本市场增长红利，"
        "打通传统金融与去中心化金融（DeFi）之间的壁垒。"
    )

    pdf.section_title("二", "代币基本信息")
    for k, v in [
        ("代币名称", "华尔街人生（Wall Street Life）"),
        ("代币符号", "$华尔街人生 / $WSL"),
        ("总供应量", "10 亿枚（1,000,000,000）"),
        ("增发规则", "固定上限，不可增发"),
        ("首发公链", "BNB Chain（BEP-20）"),
        ("初始流动性", "计划上线主流交易所，LP 锁定 1–2 年"),
    ]:
        pdf.kv_row(k, v)

    pdf.section_title("三", "代币分配（Tokenomics）")
    pdf.body("总量 10 亿枚，采用透明锁仓机制，各用途分配如下：")
    for k, v in [
        ("社区激励 & 空投（40%）", "400,000,000 枚 — 分配给分红池早期参与者、社区贡献者及预售支持者"),
        ("流动性池 LP（20%）", "200,000,000 枚 — 上线即提供流动性，1 年线性解锁"),
        ("团队 & 顾问（15%）", "150,000,000 枚 — 4 年线性释放（每季度 6.25%），防止集中抛售"),
        ("营销 & 合作伙伴（10%）", "100,000,000 枚 — 市场推广、交易所合作及美股数据合作伙伴激励"),
        ("分红池储备金 & 协议基金（15%）", "150,000,000 枚 — 股息回购分配、合规运营、协议开发及 DAO 治理"),
    ]:
        pdf.kv_row(k, v)

    pdf.add_page()
    pdf.section_title("四", "预售机制")
    pdf.sub_title("4.1  预售概况")
    for k, v in [
        ("预售总量", "50,000,000 $华尔街人生（5,000 万枚）"),
        ("预售价格", "1 USDT = 100 $华尔街人生"),
        ("支付网络", "BNB Chain（BEP-20）"),
        ("支付代币", "官方 BEP-20 USDT"),
        ("最低参与金额", "100 USDT"),
    ]:
        pdf.kv_row(k, v)

    pdf.sub_title("4.2  预售收款信息（请务必核对）")
    pdf.kv_row("预售收款地址", PRESALE_ADDRESS)
    pdf.kv_row("USDT 合约（BEP-20）", USDT_ADDRESS)
    pdf.kv_row("网络", "BNB Smart Chain（BSC 主网，Chain ID: 56）")
    pdf.body("仅向以上官方预售收款地址转账。请勿向任何个人钱包或社群私聊提供的地址转账。")

    pdf.sub_title("4.3  参与方式：转账到预售地址")
    pdf.body("方式一：钱包 App 手动转账（推荐）")
    for i, step in enumerate(
        [
            "打开支持 BSC 的钱包（MetaMask、Trust Wallet、TokenPocket 等）",
            "切换网络至 BNB Smart Chain 主网",
            "选择代币 USDT（BEP-20）",
            "点击「发送 / 转账」",
            f"收款地址填入：{PRESALE_ADDRESS}",
            "输入转账金额（不低于 100 USDT）",
            "确认网络、代币类型、收款地址无误后，完成转账",
            "保留交易哈希（Tx Hash），便于后续核对与领取代币",
        ],
        1,
    ):
        pdf.bullet(f"{i}. {step}")

    pdf.body("方式二：官网辅助参与")
    for i, step in enumerate(
        [
            "访问 www.bestha.asia",
            "连接钱包并切换至 BNB Chain",
            "输入 USDT 金额，点击「参与预售」",
            "钱包将自动发起 USDT 转账，收款方即为上述预售收款地址",
            "无需对任何合约进行 approve 授权，仅需标准 USDT 转账",
        ],
        1,
    ):
        pdf.bullet(f"{i}. {step}")

    pdf.sub_title("4.4  代币数量计算")
    for k, v in [
        ("100 USDT", "10,000 枚代币 + 10,000 空投积分"),
        ("500 USDT", "50,000 枚代币 + 50,000 空投积分"),
        ("1,000 USDT", "100,000 枚代币 + 100,000 空投积分"),
        ("5,000 USDT", "500,000 枚代币 + 500,000 空投积分"),
        ("10,000 USDT", "1,000,000 枚代币 + 1,000,000 空投积分"),
    ]:
        pdf.kv_row(k, v)
    pdf.body("计算公式：获得代币 = 转账 USDT 数量 × 100；空投积分 = 获得代币数量（1 枚 = 1 积分）")

    pdf.sub_title("4.5  注意事项")
    for note in [
        "必须使用 BEP-20 USDT，勿使用 ERC-20（以太坊）或其他链 USDT",
        "转账前请核对收款地址，链上转账不可撤销",
        "钱包内需预留少量 BNB 作为 Gas 费",
        "单笔金额不低于 100 USDT",
        "转账完成后，可在 BscScan（bscscan.com）查询交易状态",
    ]:
        pdf.bullet(note)

    pdf.sub_title("4.6  代币领取")
    pdf.body("预售参与者可在开放领取后，通过官网「领取代币」完成领取：")
    for item in [
        "需在 BNB Chain 主网操作",
        "领取时需支付约 0.27 BNB 链上费用（另需少量 BNB 作为 Gas）",
        "领取额度根据预售转账记录核算",
    ]:
        pdf.bullet(item)

    pdf.add_page()
    pdf.section_title("五", "核心机制")
    pdf.sub_title("5.1  股息分红")
    for item in [
        "持币即享按比例分配的标普 / 纳指 / 热门美股股息",
        "智能合约定期对持仓进行链上快照，按快照权重公平计算分红",
        "分红以 USDT 形式自动发放",
        "每笔分红分配链上可查，开源合约自动执行",
    ]:
        pdf.bullet(item)

    pdf.sub_title("5.2  Staking 加成")
    for item in [
        "锁定 $华尔街人生 可提升分红权重",
        "获得额外分红加成与复投收益",
        "分红可再投入 Staking，实现收益滚雪球",
    ]:
        pdf.bullet(item)

    pdf.sub_title("5.3  通缩与增值")
    pdf.body("交易税（每笔 4%）：1% 自动销毁 · 1% 回流 LP · 1% Staking 奖励池 · 1% 分红储备金")
    pdf.body("回购销毁：协议收入的 30% 用于公开市场回购并销毁 $华尔街人生。")
    pdf.body("长期供应减少，代币价值与分红池规模及美股股息收益正相关。")

    pdf.section_title("六", "代币功能一览")
    for k, v in [
        ("股息分红", "自动分配标普 500、纳指成分股及热门美股股息"),
        ("链上快照", "定期快照持仓，透明计算分红权重"),
        ("Staking 加成", "锁定代币获得更高收益份额"),
        ("透明可验证", "分红与合约逻辑链上公开可查"),
        ("全球触达", "一站式参与美股核心资产分红，连接传统金融与 DeFi"),
    ]:
        pdf.kv_row(k, v)

    pdf.section_title("七", "发展路线图")
    for k, v in [
        ("Q1 2026", "合约审计 · 社区空投 · 首期标普 500 股息分红发放"),
        ("Q2 2026", "纳指成分股分红池上线 · Staking 池 · 交易所上线"),
        ("Q3 2026", "热门科技股分红扩展 · 多链桥接 · DAO 治理平台上线"),
        ("Q4 2026", "全面美股分红生态 · $华尔街人生 自动复投分红系统"),
    ]:
        pdf.kv_row(k, v)

    pdf.section_title("八", "合作伙伴")
    pdf.body("金牌赞助商：Binance · OKX · 非小号（Feixiaohao）")

    pdf.section_title("九", "快速参与指引")
    pdf.code_block(
        f"""① 准备 BSC 钱包 + BEP-20 USDT（≥100）+ 少量 BNB（Gas）
② 向预售地址转账：
   {PRESALE_ADDRESS}
③ 保存交易哈希，等待代币开放领取
④ 访问 www.bestha.asia → 连接钱包 → 领取代币"""
    )

    pdf.ln(4)
    pdf.set_font("wqy", "B", 11)
    pdf.set_text_color(42, 10, 10)
    pdf.multi_cell(
        0,
        7,
        "一句话总结：华尔街人生是 BNB 链上首个股票分红型代币——10 亿枚固定供应，"
        "预售 1 USDT 兑 100 枚，持币享美股股息分红，配合 Staking 加成与通缩机制，"
        "打造链上共享华尔街红利的可持续生态。",
    )

    pdf.output(OUTPUT_PATH)
    shutil.copy2(OUTPUT_PATH, OUTPUT_PATH_ALT)
    print(f"Generated: {OUTPUT_PATH} ({pdf.page_no()} pages)")


if __name__ == "__main__":
    build_pdf()

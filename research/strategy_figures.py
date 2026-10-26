"""Fixed visual specification for the paired follow-up; no data-driven panels."""
from __future__ import annotations

import json
from pathlib import Path
import numpy as np
from research.strategy_analysis import ROOT, PROFILES, NAMES, analyze, verify_study, digest

COLORS = ("#66717d", "#226a8f", "#ad6814", "#287d63", "#8e547f")
MARKERS = ("o", "s", "^", "D", "v")
PATTERNS = ("-", "--", "-.", ":", (0,(5,1,1,1)))


def p_label(row):
    p = row["adjustedP"]
    return f'{row["annotation"]}; p={p:.2g}' if p else f'{row["annotation"]}; p<1e-300'


def figures(root: Path = ROOT) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.ticker import MaxNLocator
    data = verify_study(root)
    analysis = analyze(data)
    plt.rcParams.update({"font.family":"DejaVu Sans","font.size":18,"axes.titlesize":18,
                         "axes.labelsize":18,"xtick.labelsize":18,"ytick.labelsize":18,"axes.spines.top":False,
                         "axes.spines.right":False,"svg.fonttype":"none","savefig.facecolor":"white"})
    output = root/"manuscript/figures"
    text_metadata = {}
    def save(fig,name):
        fig.canvas.draw()
        renderer=fig.canvas.get_renderer()
        for ax in fig.axes:
            bounds=sorted((t.get_window_extent(renderer) for t in ax.get_xticklabels() if t.get_visible() and t.get_text()),key=lambda b:b.x0)
            if any(a.x1+2>b.x0 for a,b in zip(bounds,bounds[1:])):
                raise ValueError(f"Overlapping scientific x-axis tick labels: {name}")
        for extension in ("png","pdf","svg"):
            fig.savefig(output/f"{name}.{extension}",dpi=220,bbox_inches="tight",pad_inches=.18)
        from matplotlib.text import Text
        text_metadata[name] = {"minimumSourceFontPt":min(t.get_fontsize() for t in fig.findobj(Text) if t.get_text().strip()),"dpi":220}
        plt.close(fig)
    def comparison(count,profile,endpoint):
        return next(r for r in analysis["comparisons"] if (r["count"],r["profile"],r["endpoint"]) == (count,profile,endpoint))

    fig,axes=plt.subplots(2,1,figsize=(10,7.2),sharex=True,layout="constrained")
    for ax,count in zip(axes,(256,4096),strict=True):
        for j,profile in enumerate(PROFILES):
            cases=sorted((c for c in data["cases"] if c["count"]==count and c["profile"]==profile),key=lambda c:c["index"])
            values=np.array([c["shots"] for c in cases])
            jitter=((np.arange(128)*73)%128)/127*.48-.24
            ax.scatter(values,j+jitter,s=18,alpha=.5,c=COLORS[j],marker=MARKERS[j],linewidths=.3)
            ax.plot([values.mean()]*2,[j-.28,j+.28],color="black",lw=2.3)
            ax.scatter(np.median(values),j,marker="D",facecolor="white",edgecolor="black",s=36,zorder=4)
            if profile!="pragmatic":
                r=comparison(count,profile,"shots")
                ax.text(1.025,j,r["annotation"],transform=ax.get_yaxis_transform(),va="center",fontsize=18)
        ax.set(title=f"M = {count:,} · n = 128 paired cases",ylim=(4.65,-.65),
               yticks=range(5),yticklabels=["Random","Pragmatic","Epistemic","Combined β=1","Weighted β=4"],
               xlim=(15,102),xticks=[17,40,60,80,100])
        ax.grid(axis="x",alpha=.18)
        ax.text(1.025,1.02,"Holm",transform=ax.transAxes,fontsize=18)
    axes[-1].set_xlabel("Completion shots T · lower is better")
    save(fig,"strategy-completion")

    fig,axes=plt.subplots(3,2,figsize=(10,8.4),layout="constrained")
    labels=("Δ completion shots","Δ hits at shot 5","Δ H₅ / ln(M)")
    for col,count in enumerate((256,4096)):
        for row,(metric,label) in enumerate(zip(("shots","hits5","entropy5"),labels,strict=True)):
            ax=axes[row,col]
            for j,profile in enumerate(PROFILES[2:]):
                r=comparison(count,profile,metric)
                ax.plot([r["lower"],r["upper"]],[j,j],color=COLORS[j+2],lw=2)
                ax.scatter(r["meanDifference"],j,color=COLORS[j+2],marker=MARKERS[j+2],s=45,zorder=3)
                ax.text(1.04,j,f'{r["wins"]}/{r["ties"]}/{r["losses"]}  {r["annotation"]}',
                        transform=ax.get_yaxis_transform(),va="center",fontsize=18)
            ax.axvline(0,color="#444444",lw=.9,ls="--"); ax.set_ylim(2.65,-.65)
            ax.set_yticks(range(3),["Info","G₁","G₄"] if col==0 else [])
            ax.set_xlabel(label,fontsize=18); ax.grid(axis="x",alpha=.16)
            ax.margins(x=.15)
            ax.xaxis.set_major_locator(MaxNLocator(2))
            if row==0: ax.set_title(f"M = {count:,}",loc="left")
            ax.text(1.04,1.06,"F / T / U",transform=ax.transAxes,fontsize=18)
    fig.suptitle("Info = epistemic · G₁ = combined · G₄ = weighted\nDifferences from pragmatic",fontsize=18)
    save(fig,"strategy-effects")

    fig,axes=plt.subplots(2,2,figsize=(10,7),layout="constrained",sharex=True)
    for col,count in enumerate((256,4096)):
        for j,profile in enumerate(PROFILES):
            cases=sorted((c for c in data["cases"] if c["count"]==count and c["profile"]==profile),key=lambda c:c["index"])
            hits=[]; entropies=[]
            for t in range(31):
                steps=[c["trace"][min(t,len(c["trace"]))-1] for c in cases] if t else []
                hits.append(np.mean([s["hits"] for s in steps]) if t else 0.)
                entropies.append(np.mean([s["posteriorEntropy"]/np.log(count) for s in steps]) if t else 1.)
            for ax,values in ((axes[0,col],hits),(axes[1,col],entropies)):
                ax.plot(range(31),values,color=COLORS[j],marker=MARKERS[j],linestyle=PATTERNS[j],
                        markevery=[0,5,10,15,20,25,30],markersize=5,lw=2,label=NAMES[j])
                ax.grid(alpha=.16)
        axes[0,col].set(title=f"M = {count:,} · n = 128",ylim=(0,17.5),yticks=[0,5,10,17])
        axes[1,col].set(ylim=(0,1.03),xlabel="Shots observed",xticks=[0,5,15,30],yticks=[0,.5,1])
        for ax in axes[:,col]: ax.axvline(5,color="#333333",lw=.9,ls="--"); ax.set_xlim(0,30)
    axes[0,0].set_ylabel("Mean hits\n(higher is better)")
    axes[1,0].set_ylabel("Mean H / ln(M)\n(lower is better)")
    handles,labels=axes[0,0].get_legend_handles_labels()
    fig.legend(handles,labels,loc="outside upper center",ncol=3,fontsize=18,
               columnspacing=1,handlelength=1.8,handletextpad=.4)
    save(fig,"strategy-trajectories")

    # This analytical view evaluates the declared score on a continuous forecast
    # axis. It neither adds cases nor assumes that a real board attains an optimum.
    p=np.linspace(0,1,1001)
    entropy=np.zeros_like(p)
    interior=(p>0)&(p<1)
    entropy[interior]=-p[interior]*np.log(p[interior])-(1-p[interior])*np.log1p(-p[interior])
    values=(2*p,entropy,2*p+entropy,2*p+4*entropy)
    optima=(1.,.5,1/(1+np.exp(-2)),1/(1+np.exp(-.5)))
    fig,axes=plt.subplots(1,2,figsize=(10,4.8),layout="constrained",width_ratios=[1.35,1])
    for j,(value,optimum) in enumerate(zip(values,optima,strict=True),start=1):
        axes[0].plot(p,value,color=COLORS[j],linestyle=PATTERNS[j],lw=2,label=NAMES[j])
        axes[1].scatter(optimum,j,color=COLORS[j],marker=MARKERS[j],s=65,zorder=3)
        axes[1].text(optimum-.035,j-.28,f"{optimum:.3f}",ha="right",va="center",fontsize=18)
    axes[0].set(xlim=(0,1),ylim=(0,4.3),xticks=[0,.5,1],yticks=[0,2,4],
                xlabel="Hit probability p",ylabel="One step value in nats",title="Values being maximized")
    axes[1].set(xlim=(.35,1.05),ylim=(4.6,.4),xticks=[.5,.75,1],
                yticks=range(1,5),yticklabels=["Hit","Info","G₁","G₄"],
                xlabel="Preferred probability p*",title="Continuous optima")
    for ax in axes:ax.grid(alpha=.16)
    handles,labels=axes[0].get_legend_handles_labels()
    fig.legend(handles,labels,loc="outside upper center",ncol=2,fontsize=18)
    save(fig,"strategy-objectives")

    rows=["| M | Profile | Endpoint | Mean Δ [95% descriptive interval] | Favorable/tied/unfavorable | Holm p |",
          "|---:|:---|:---|---:|:---|---:|"]
    for r in analysis["comparisons"]:
        name=NAMES[PROFILES.index(r["profile"])]
        rows.append(f'| {r["count"]:,} | {name} | {r["endpoint"]} | {r["meanDifference"]:+.3f} [{r["lower"]:+.3f}, {r["upper"]:+.3f}] | {r["wins"]}/{r["ties"]}/{r["losses"]} | {r["adjustedP"]:.3g} |')
    (root/"research/generated/strategy-study/comparisons.md").write_text("\n".join(rows)+"\n")
    (root/"research/generated/strategy-study/figure-text.json").write_text(json.dumps(text_metadata,indent=2)+"\n")
    print(json.dumps({"figures":4,"plannedComparisons":len(analysis["comparisons"])}))


if __name__ == "__main__": figures()

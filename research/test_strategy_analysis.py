import unittest
import copy
import json
from pathlib import Path
import shutil
import tempfile
import numpy as np
from research.strategy_analysis import ROOT, comparison, digest, holm, verify_study
from research.source_inventory import source_paths


class StrategyStatisticsTests(unittest.TestCase):
    def test_main_figure_geometry_rejects_previous_label_layout(self):
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib.patches import FancyBboxPatch
        from research.manuscript import require_figure_geometry
        for corrected in (False,True):
            options={"figsize":(10,5.3),"layout":"constrained"} if corrected else {"figsize":(9,4.5)}
            fig,ax=plt.subplots(**options)
            try:
                ax.set(xlim=(0,10),ylim=(0,5));ax.axis("off")
                patch=FancyBboxPatch((.2,3.1),3.6,1.4,boxstyle="round,pad=.1")
                ax.add_patch(patch)
                text=ax.text(2,3.8,"GNN source → parser\nStrict contract adapter\nModel + source digests",
                             ha="center",va="center",linespacing=1.45,fontsize=18)
                if corrected:
                    report=require_figure_geometry(fig,"architecture",[(patch,text)])
                    self.assertEqual(report["boxedLabelsChecked"],1)
                else:
                    with self.assertRaisesRegex(ValueError,"outside box"):
                        require_figure_geometry(fig,"architecture",[(patch,text)])
                outside=ax.text(.5,1.3,"Residual clipped label",transform=ax.transAxes,fontsize=18)
                with self.assertRaisesRegex(ValueError,"outside canvas"):
                    require_figure_geometry(fig,"analytic")
                outside.remove()
            finally:plt.close(fig)

    def test_placed_scientific_font_gate(self):
        from research.strategy_validation import require_placed_font
        self.assertAlmostEqual(require_placed_font(18,220,2200,432),10.8)
        with self.assertRaisesRegex(ValueError,"below 9"):
            require_placed_font(14,220,2200,432)
        with self.assertRaisesRegex(ValueError,"below 9"):
            require_placed_font(9,220,2200,392)
        with self.assertRaisesRegex(ValueError,"Invalid scientific"):
            require_placed_font(14,0,2200,432)
        with self.assertRaisesRegex(ValueError,"Invalid scientific"):
            require_placed_font(float("nan"),220,2200,432)

    def test_exact_sign_and_family_fixture(self):
        row=comparison([1.]*10+[0.]*118,"shots",np.random.default_rng(3))
        self.assertEqual((row["wins"],row["ties"],row["losses"]),(0,118,10))
        self.assertEqual(row["rawP"],1/512)
        adjusted=holm([row["rawP"]]+[1.]*23)
        self.assertEqual(adjusted[0],.046875)
        self.assertEqual(adjusted[1:],[1.]*23)

    def test_all_ties_and_raw_small_differences(self):
        row=comparison([0.]*128,"shots",np.random.default_rng(1))
        self.assertEqual((row["rawP"],row["lower"],row["upper"]),(1,0,0))
        small=comparison([1e-11]*128,"entropy5",np.random.default_rng(1))
        self.assertEqual(small["ties"],128)
        self.assertGreater(small["meanDifference"],0)
        self.assertGreater(small["lower"],0)
        self.assertEqual(small["rawP"],1)

    def test_pair_order_and_endpoint_direction(self):
        values=np.array([-2.,-1.,1.,3.]*32)
        a=comparison(values,"shots",np.random.default_rng(1))
        b=comparison(values[::-1],"hits5",np.random.default_rng(1))
        self.assertEqual(a["rawP"],b["rawP"])
        self.assertAlmostEqual(a["meanDifference"],b["meanDifference"])
        self.assertEqual(a["wins"],b["losses"])
        self.assertLessEqual(a["lower"],a["meanDifference"])
        self.assertGreaterEqual(a["upper"],a["meanDifference"])

    def test_reject_invalid_evidence(self):
        for values in ([],[float("nan")],[float("inf")]):
            with self.assertRaisesRegex(ValueError,"Invalid paired"):
                comparison(values,"shots",np.random.default_rng(1))
        for values in ([],[-.1],[1.1],[float("nan")]):
            with self.assertRaisesRegex(ValueError,"Invalid Holm"):
                holm(values)

    def test_complete_study_and_reject_corrupt_pairs(self):
        data=verify_study()
        self.assertEqual(len(data["cases"]),1280)
        self.assertEqual(sum(c["shots"] for c in data["cases"]),47975)
        with tempfile.TemporaryDirectory(prefix="strategy-inputs-") as temp:
            root=Path(temp)
            paths=[*source_paths(ROOT, "strategy"), "research/generated/strategy-study/pilot.json",
                   "research/generated/strategy-study/results.json", "research/generated/strategy-study/preexecution.json"]
            for relative in paths:
                target=root/relative
                target.parent.mkdir(parents=True,exist_ok=True)
                shutil.copyfile(ROOT/relative,target)
            destination=root/"research/generated/strategy-study/results.json"
            original=json.loads(destination.read_text())
            mutations=[
                lambda d:d["cases"].pop(),
                lambda d:d["cases"][1].update(catalogueSha256="altered"),
                lambda d:d["cases"][0]["trace"][1].update(cell=d["cases"][0]["trace"][0]["cell"]),
                lambda d:d["cases"][0]["trace"][0].update(posteriorEntropy=float("nan")),
                lambda d:d["cases"][0].update(catalogSeed=1),
            ]
            for mutate in mutations:
                broken=copy.deepcopy(original); mutate(broken)
                destination.write_text(json.dumps(broken))
                with self.assertRaises(ValueError): verify_study(root)
            destination.write_text(json.dumps(original))
            self.assertEqual(len(verify_study(root)["cases"]),1280)
            (root/"src/core/inference.ts").write_text("changed")
            with self.assertRaisesRegex(ValueError,"Changed strategy input"): verify_study(root)


class StrategyAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="strategy-admission-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for relative in source_paths(ROOT, "strategy"):
            target = self.root/relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT/relative, target)
        self.base = self.root/"research/generated/strategy-study"
        self.base.mkdir(parents=True)
        # New negative-control metadata, not relabeled historical observations.
        # Empty cases ensure this fixture cannot pass the full scientific gate.
        sources = {name: digest(self.root/name) for name in source_paths(self.root, "strategy")}
        (self.base/"pilot.json").write_text(json.dumps({"passed": False, "sources": sources}))
        (self.base/"preexecution.json").write_text(json.dumps({
            "sources": sources, "pilotSha256": digest(self.base/"pilot.json"),
        }))
        (self.base/"results.json").write_text(json.dumps({
            "preexecutionSha256": digest(self.base/"preexecution.json"), "cases": [],
        }))

    def test_unpassed_pilot_cannot_authorize_a_bound_production_receipt(self):
        with self.assertRaisesRegex(ValueError, "production computation gate"):
            verify_study(self.root)

    def test_changed_pilot_bytes_invalidate_the_preexecution_binding(self):
        path = self.base/"pilot.json"
        data = json.loads(path.read_text())
        data["passed"] = True
        path.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, "production computation gate"):
            verify_study(self.root)

    def test_receipt_cannot_omit_required_source_members(self):
        path = self.base/"preexecution.json"
        data = json.loads(path.read_text())
        del data["sources"]["src/core/inference.ts"]
        path.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, "source inventory"):
            verify_study(self.root)

    def test_pilot_and_production_must_bind_the_same_runtime(self):
        pilot_path = self.base/"pilot.json"
        freeze_path = self.base/"preexecution.json"
        results_path = self.base/"results.json"
        runtime = {"bun": "fixture-runtime-A", "nodeCompatibility": "fixture-node",
                   "platform": "fixture-platform", "arch": "fixture-arch"}
        pilot = json.loads(pilot_path.read_text())
        pilot.update(passed=True, runtime=runtime)
        pilot_path.write_text(json.dumps(pilot))
        freeze = json.loads(freeze_path.read_text())
        freeze.update(pilotSha256=digest(pilot_path), runtime={**runtime, "bun": "fixture-runtime-B"})
        freeze_path.write_text(json.dumps(freeze))
        results = json.loads(results_path.read_text())
        results["preexecutionSha256"] = digest(freeze_path)
        results_path.write_text(json.dumps(results))
        with self.assertRaisesRegex(ValueError, "runtime binding"):
            verify_study(self.root)


if __name__=="__main__": unittest.main()

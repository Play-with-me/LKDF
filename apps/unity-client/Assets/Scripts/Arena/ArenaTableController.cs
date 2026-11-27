using System;
using System.Collections.Generic;
using CuuChau.Data;
using CuuChau.Net;
using TMPro;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace CuuChau.Arena
{
    /// <summary>
    /// Điều phối bố cục bàn đấu hình móng ngựa Responsive cho 4 đến 8 người chơi
    /// (tương thích 1920x1080 và 1280x720, chừa đáy 240px cho quạt bài và vùng trung tâm cho Bàn Rút/Bỏ).
    /// Ghế của tôi (ViewerSeatIndex) neo gọn ở Góc Dưới-Trái, 3-7 đối thủ rải đều vòng cung trên & 2 bên.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ArenaTableController : MonoBehaviour
    {
        private static readonly Vector2 ViewerSeatAnchor = new(0.128f, 0.132f);
        private static readonly Vector2 ViewerSeatSize = new(396f, 206f);
        private static readonly Vector2 OpponentSeatSize = new(378f, 198f);

        private readonly List<SeatPlaqueView> _seatViews = new();
        private readonly Dictionary<int, SeatPlaqueView> _seatByIndex = new();

        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private RectTransform _rootRect;
        private bool _initialized;
        private bool _reducedMotion;

        private int _viewerSeatIndex;
        private int _currentTurnSeat = -1;
        private int _targetedSeat = -1;

        public event Action<int> OnSeatClicked;
        public event Action<CardInstanceDto, string, RectTransform> OnEquipmentHovered;
        public event Action OnEquipmentHoverExited;

        public int ViewerSeatIndex => _viewerSeatIndex;

        public void InitializeArena(
            VisualCatalogSO catalog,
            TMP_FontAsset serifFont,
            TMP_FontAsset sansFont,
            TMP_FontAsset monoFont)
        {
            _catalog = catalog;
            _serifFont = serifFont;
            _sansFont = sansFont;
            _monoFont = monoFont;

            _rootRect = transform as RectTransform;
            if (_rootRect == null) _rootRect = gameObject.AddComponent<RectTransform>();
            _rootRect.anchorMin = Vector2.zero;
            _rootRect.anchorMax = Vector2.one;
            _rootRect.offsetMin = Vector2.zero;
            _rootRect.offsetMax = Vector2.zero;

            _initialized = true;
        }

        public void UpdateFromState(PlayerViewStateDto state)
        {
            if (!_initialized) InitializeArena(_catalog, _serifFont, _sansFont, _monoFont);
            if (state == null || state.Players == null || state.Players.Count == 0) return;

            int totalPlayers = state.Players.Count;
            _viewerSeatIndex = Mathf.Clamp(state.ViewerSeatIndex, 0, totalPlayers - 1);
            _currentTurnSeat = state.CurrentTurnSeat;

            EnsureSeatPool(totalPlayers);
            _seatByIndex.Clear();

            for (int i = 0; i < _seatViews.Count; i++)
            {
                SeatPlaqueView view = _seatViews[i];
                if (i >= totalPlayers)
                {
                    view.gameObject.SetActive(false);
                    continue;
                }

                PublicPlayerViewDto player = state.Players[i];
                view.gameObject.SetActive(true);

                int relIndex = (player.SeatIndex - _viewerSeatIndex + totalPlayers) % totalPlayers;
                PositionSeatView(view, relIndex, totalPlayers);

                bool isCurrentTurn = player.SeatIndex == _currentTurnSeat;
                bool isTargeted = player.SeatIndex == _targetedSeat;
                view.BindPlayer(player, _catalog, isCurrentTurn, isTargeted);
                view.SetReducedMotion(_reducedMotion);

                _seatByIndex[player.SeatIndex] = view;
            }
        }

        public void PopulateDemoPreview(int totalSeats = 6, int targetedSeatIndex = 3)
        {
            if (!_initialized) InitializeArena(_catalog, _serifFont, _sansFont, _monoFont);

            int clampedTotal = Mathf.Clamp(totalSeats, 4, 8);
            _viewerSeatIndex = 0;
            _currentTurnSeat = 0;
            _targetedSeat = Mathf.Clamp(targetedSeatIndex, 0, clampedTotal - 1);

            EnsureSeatPool(clampedTotal);
            _seatByIndex.Clear();

            var demoRoster = BuildDemoRoster();
            for (int i = 0; i < _seatViews.Count; i++)
            {
                SeatPlaqueView view = _seatViews[i];
                if (i >= clampedTotal)
                {
                    view.gameObject.SetActive(false);
                    continue;
                }

                view.gameObject.SetActive(true);
                PositionSeatView(view, i, clampedTotal);

                DemoSeatSpec spec = demoRoster[i % demoRoster.Length];
                view.PopulateSample(
                    i,
                    spec.HeroId,
                    spec.HeroNameVi,
                    spec.Faction,
                    spec.IdentityLabel,
                    spec.Hp,
                    spec.MaxHp,
                    spec.HandCount,
                    _catalog,
                    isCurrentTurn: i == _currentTurnSeat,
                    isTargeted: i == _targetedSeat,
                    equipments: spec.Equipments,
                    delayedScrolls: spec.DelayedScrolls);
                view.SetReducedMotion(_reducedMotion);

                _seatByIndex[i] = view;
            }
        }

        public SeatPlaqueView GetSeatView(int seatIndex)
        {
            return _seatByIndex.TryGetValue(seatIndex, out SeatPlaqueView view) ? view : null;
        }

        public void SetTargetedSeat(int seatIndex)
        {
            _targetedSeat = seatIndex;
            foreach (KeyValuePair<int, SeatPlaqueView> kvp in _seatByIndex)
            {
                kvp.Value.SetTargeted(kvp.Key == seatIndex);
            }
        }

        public void SetValidTargetSeats(IReadOnlyCollection<int> validSeatIndices)
        {
            var set = validSeatIndices != null ? new HashSet<int>(validSeatIndices) : null;
            foreach (KeyValuePair<int, SeatPlaqueView> kvp in _seatByIndex)
            {
                kvp.Value.SetValidTargetHighlight(set != null && set.Contains(kvp.Key));
            }
        }

        public void SetReducedMotion(bool reducedMotion)
        {
            _reducedMotion = reducedMotion;
            for (int i = 0; i < _seatViews.Count; i++)
            {
                _seatViews[i].SetReducedMotion(reducedMotion);
            }
        }

        /// <summary>
        /// Trả về neo chuẩn hóa (0..1 trong khung bàn đấu) theo vị trí tương đối so với Viewer (relIndex = 0 là Tôi ở Góc Dưới-Trái).
        /// </summary>
        public Vector2 GetHorseshoeAnchor(int relIndex, int totalPlayers)
        {
            if (relIndex <= 0) return ViewerSeatAnchor;

            int opponentCount = Mathf.Clamp(totalPlayers - 1, 3, 7);
            int oppIdx = Mathf.Clamp(relIndex - 1, 0, opponentCount - 1);

            switch (opponentCount)
            {
                case 3:
                    return oppIdx switch
                    {
                        0 => new Vector2(0.145f, 0.540f),
                        1 => new Vector2(0.500f, 0.855f),
                        _ => new Vector2(0.855f, 0.540f),
                    };
                case 4:
                    return oppIdx switch
                    {
                        0 => new Vector2(0.135f, 0.500f),
                        1 => new Vector2(0.340f, 0.825f),
                        2 => new Vector2(0.660f, 0.825f),
                        _ => new Vector2(0.865f, 0.500f),
                    };
                case 5:
                    return oppIdx switch
                    {
                        0 => new Vector2(0.125f, 0.555f),
                        1 => new Vector2(0.275f, 0.822f),
                        2 => new Vector2(0.500f, 0.865f),
                        3 => new Vector2(0.725f, 0.822f),
                        _ => new Vector2(0.875f, 0.555f),
                    };
                case 6:
                    return oppIdx switch
                    {
                        0 => new Vector2(0.115f, 0.455f),
                        1 => new Vector2(0.195f, 0.745f),
                        2 => new Vector2(0.395f, 0.855f),
                        3 => new Vector2(0.605f, 0.855f),
                        4 => new Vector2(0.805f, 0.745f),
                        _ => new Vector2(0.885f, 0.455f),
                    };
                default: // 7 opponents (8-player table)
                    return oppIdx switch
                    {
                        0 => new Vector2(0.110f, 0.425f),
                        1 => new Vector2(0.140f, 0.675f),
                        2 => new Vector2(0.310f, 0.822f),
                        3 => new Vector2(0.500f, 0.862f),
                        4 => new Vector2(0.690f, 0.822f),
                        5 => new Vector2(0.860f, 0.675f),
                        _ => new Vector2(0.890f, 0.425f),
                    };
            }
        }

        private void Update()
        {
            if (!_initialized || _reducedMotion) return;

            Vector2 pointerNormalized = Vector2.zero;
#if ENABLE_INPUT_SYSTEM
            if (Mouse.current != null)
            {
                Vector2 screenPos = Mouse.current.position.ReadValue();
                float w = Mathf.Max(1f, Screen.width);
                float h = Mathf.Max(1f, Screen.height);
                pointerNormalized = new Vector2((screenPos.x / w) * 2f - 1f, (screenPos.y / h) * 2f - 1f);
            }
#elif ENABLE_LEGACY_INPUT_MANAGER
            Vector3 screenPos = Input.mousePosition;
            float w = Mathf.Max(1f, Screen.width);
            float h = Mathf.Max(1f, Screen.height);
            pointerNormalized = new Vector2((screenPos.x / w) * 2f - 1f, (screenPos.y / h) * 2f - 1f);
#endif
            for (int i = 0; i < _seatViews.Count; i++)
            {
                if (_seatViews[i].gameObject.activeInHierarchy)
                {
                    _seatViews[i].UpdateParallax(pointerNormalized);
                }
            }
        }

        private void PositionSeatView(SeatPlaqueView view, int relIndex, int totalPlayers)
        {
            var rt = view.GetComponent<RectTransform>();
            Vector2 anchor = GetHorseshoeAnchor(relIndex, totalPlayers);
            rt.anchorMin = anchor;
            rt.anchorMax = anchor;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = Vector2.zero;

            bool isViewer = relIndex == 0;
            rt.sizeDelta = isViewer ? ViewerSeatSize : OpponentSeatSize;

            float scale = 1f;
            if (!isViewer && totalPlayers >= 8) scale = 0.91f;
            else if (!isViewer && totalPlayers == 7) scale = 0.95f;
            rt.localScale = new Vector3(scale, scale, 1f);

            view.SetViewerLayoutScale(isViewer);
        }

        private void EnsureSeatPool(int count)
        {
            while (_seatViews.Count < count)
            {
                int idx = _seatViews.Count;
                var go = new GameObject($"SeatPlaque_{idx}", typeof(RectTransform), typeof(SeatPlaqueView));
                go.transform.SetParent(_rootRect, false);
                var plaque = go.GetComponent<SeatPlaqueView>();
                plaque.BuildHierarchyIfNeeded(_catalog, _serifFont, _sansFont, _monoFont);
                plaque.OnSeatClicked += seat => OnSeatClicked?.Invoke(seat);
                if (plaque.EquipmentGrid != null)
                {
                    plaque.EquipmentGrid.OnSlotHovered += (card, summary, rect) => OnEquipmentHovered?.Invoke(card, summary, rect);
                    plaque.EquipmentGrid.OnSlotHoverExited += () => OnEquipmentHoverExited?.Invoke();
                }
                _seatViews.Add(plaque);
            }
        }

        private struct DemoSeatSpec
        {
            public string HeroId;
            public string HeroNameVi;
            public string Faction;
            public string IdentityLabel;
            public int Hp;
            public int MaxHp;
            public int HandCount;
            public PlayerEquipmentsDto Equipments;
            public List<CardInstanceDto> DelayedScrolls;
        }

        private static DemoSeatSpec[] BuildDemoRoster()
        {
            return new[]
            {
                new DemoSeatSpec
                {
                    HeroId = "lam_thanh_vu",
                    HeroNameVi = "Lâm Thanh Vũ",
                    Faction = "THIEN_KIEM",
                    IdentityLabel = "Chủ Công",
                    Hp = 4,
                    MaxHp = 4,
                    HandCount = 5,
                    Equipments = new PlayerEquipmentsDto
                    {
                        Weapon = MakeCard("thanh_long_yen_nguyet_dao", "Huyền Long", "SPADE", "5"),
                        Armor = MakeCard("bat_quai_tran", "Bát Quái Y", "CLUB", "2"),
                    },
                },
                new DemoSeatSpec
                {
                    HeroId = "han_thiet_phong",
                    HeroNameVi = "Hàn Thiết Phong",
                    Faction = "HUYEN_THIET",
                    IdentityLabel = "Ẩn",
                    Hp = 3,
                    MaxHp = 4,
                    HandCount = 4,
                    Equipments = new PlayerEquipmentsDto
                    {
                        MinusOneHorse = MakeCard("xich_tho", "Truy Ảnh Hài", "HEART", "5"),
                    },
                },
                new DemoSeatSpec
                {
                    HeroId = "to_mong_dao",
                    HeroNameVi = "Tô Mộng Dao",
                    Faction = "THIEN_KIEM",
                    IdentityLabel = "Ẩn",
                    Hp = 2,
                    MaxHp = 3,
                    HandCount = 6,
                    DelayedScrolls = new List<CardInstanceDto>
                    {
                        MakeCard("lac_bat_tu_thuc", "Điểm Huyệt Phong Mạch", "HEART", "6"),
                    },
                },
                new DemoSeatSpec
                {
                    HeroId = "trieu_thien_hanh",
                    HeroNameVi = "Triệu Thiên Hành",
                    Faction = "THIEN_KIEM",
                    IdentityLabel = "Ẩn",
                    Hp = 3,
                    MaxHp = 4,
                    HandCount = 3,
                    Equipments = new PlayerEquipmentsDto
                    {
                        Weapon = MakeCard("thanh_cong_kiem", "Thanh Phong", "SPADE", "6"),
                        Armor = MakeCard("hoan_anh_giap", "Huyễn Ảnh", "CLUB", "2"),
                        PlusOneHorse = MakeCard("tuyet_anh", "Đạp Tuyết", "SPADE", "5"),
                    },
                },
                new DemoSeatSpec
                {
                    HeroId = "loi_chan_son",
                    HeroNameVi = "Lôi Chấn Sơn",
                    Faction = "THIEN_KIEM",
                    IdentityLabel = "Ẩn",
                    Hp = 1,
                    MaxHp = 3,
                    HandCount = 2,
                    DelayedScrolls = new List<CardInstanceDto>
                    {
                        MakeCard("thiem_dien", "Thiên Lôi Kiếp", "SPADE", "A"),
                    },
                },
                new DemoSeatSpec
                {
                    HeroId = "co_huyen_co",
                    HeroNameVi = "Cố Huyền Cơ",
                    Faction = "HUYEN_THIET",
                    IdentityLabel = "Ẩn",
                    Hp = 3,
                    MaxHp = 3,
                    HandCount = 4,
                    Equipments = new PlayerEquipmentsDto
                    {
                        Weapon = MakeCard("ky_lan_cung", "Linh Điểu", "HEART", "5"),
                    },
                },
                new DemoSeatSpec
                {
                    HeroId = "diep_vu_ngung",
                    HeroNameVi = "Diệp Vũ Ngưng",
                    Faction = "GIANG_NAM",
                    IdentityLabel = "Ẩn",
                    Hp = 2,
                    MaxHp = 3,
                    HandCount = 5,
                },
                new DemoSeatSpec
                {
                    HeroId = "khuong_vo_ta",
                    HeroNameVi = "Khương Vô Tà",
                    Faction = "AN_SAT",
                    IdentityLabel = "Ẩn",
                    Hp = 4,
                    MaxHp = 4,
                    HandCount = 3,
                },
            };
        }

        private static CardInstanceDto MakeCard(string key, string nameVi, string suit, string rank)
        {
            return new CardInstanceDto
            {
                Id = $"demo_{key}_{rank}",
                CardKey = key,
                NameVi = nameVi,
                Suit = suit,
                Rank = rank,
            };
        }
    }
}
